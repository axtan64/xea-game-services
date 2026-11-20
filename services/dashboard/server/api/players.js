const { Router } = require('express');
const { CutcSaveSlot, CutcSlotAccess, GameMembership, Purchase, User, STATS_MODELS_BY_SLUG } = require('database');
const { audit } = require('../lib/audit');
const { PublishError, accountChanged, productGranted, tellLiveServers } = require('../lib/communication');
const { describeMembership, describePurchase, describeSlot, purchasePeople } = require('../lib/describe');
const { LIVE_WITHIN_MS } = require('../lib/games');
const { findGrantable, grantable } = require('../lib/products');
const { findUserIdByUsername, getProfiles, isUserId } = require('../lib/roblox');
const robloxBans = require('../lib/robloxBans');

const playersRouter = Router({ mergeParams: true });

// A reason is shown to the player, on the kick screen
const MAX_REASON = 200;
const MOST_BAN_DAYS = 3650;
const DAY_MS = 24 * 60 * 60 * 1000;
// Games whose players have save slots (Clean Up The City's cities)
const HAS_CITIES = new Set(['cutc']);

// Prisma's "no such row", which GameMembership throws for a player with no membership to change
const isNotFound = (err) => err?.code === 'P2025';

function readReason(value) {
    const reason = typeof value === 'string' ? value.trim() : '';
    return reason && reason.length <= MAX_REASON ? reason : null;
}

// A player's standing: admin from the database, and their ban from Roblox for a game that bans through Roblox
// (lib/robloxBans), or from the database for one that doesn't. A ban Roblox can't be asked about is reported, not
// guessed
async function readStanding(game, userId, membership) {
    const standing = { ...describeMembership(membership), bansWith: 'database', banError: null };
    if (!robloxBans.usesRobloxBans(game)) return standing;

    standing.bansWith = 'roblox';
    try {
        const ban = await robloxBans.getBan(game, userId);
        return { ...standing, ...ban };
    } catch (err) {
        return { ...standing, isBanned: false, bannedAt: null, banReason: null, banExpiresAt: null, banError: err.message };
    }
}

// Every route under /:userId needs a real user ID
playersRouter.use('/:userId', (req, res, next) => {
    if (req.params.userId === 'find') return next();
    if (!isUserId(req.params.userId)) return res.status(400).json({ error: 'That isn\'t a Roblox user ID' });
    next();
});

// Finds a player by username or user ID. Digits are an ID; put @ before a username made only of digits
playersRouter.get('/find', async (req, res) => {
    const query = String(req.query.q ?? '').trim();

    if (!query) return res.status(400).json({ error: 'Type a username or user ID' });
    if (isUserId(query)) return res.json({ userId: query });

    const username = query.replace(/^@/, '');
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
        return res.status(400).json({ error: 'That isn\'t a Roblox username or user ID' });

    const userId = await findUserIdByUsername(username);
    if (!userId) return res.status(404).json({ error: `Nobody on Roblox is called "${username}"` });

    res.json({ userId });
});

// Everything the dashboard knows of a player in this game: their profile, standing, stats, passes, save slots,
// the city they're in now and their purchases
playersRouter.get('/:userId', async (req, res) => {
    const { game } = req;
    const { userId } = req.params;
    const statsModel = STATS_MODELS_BY_SLUG[game.slug]?.Model;
    const hasCities = HAS_CITIES.has(game.slug);

    const membership = await GameMembership.get(game.id, userId);
    const [standing, stats, purchases, slots, access, playing] = await Promise.all([
        readStanding(game, userId, membership),
        statsModel ? statsModel.get(userId) : null,
        Purchase.recent({ gameId: game.id, robloxId: userId, take: 25 }),
        hasCities ? CutcSaveSlot.list(userId) : [],
        hasCities ? CutcSlotAccess.list(userId) : [],
        hasCities ? CutcSaveSlot.playing(userId, LIVE_WITHIN_MS) : null,
    ]);

    const playingOwner = playing ? String(playing.ownerId) : null;
    const people = await getProfiles([userId, ...purchasePeople(purchases), ...(playingOwner ? [playingOwner] : [])]);
    const owned = stats?.ownedProducts ?? {};
    const known = grantable(game.slug);

    res.json({
        profile: people[userId],
        membership: standing,
        hasStats: Boolean(statsModel),
        stats,
        products: known.map((product) => ({ ...product, owned: owned[product.key] === true })),
        otherProducts: Object.keys(owned).filter((key) => owned[key] && !known.some((product) => product.key === key)),
        hasCities,
        slots: slots.map((slot) => {
            const sharing = access.find((entry) => entry.slot === slot.slot);
            return {
                ...describeSlot(slot),
                access: sharing?.access ?? 'Friends',
                allowAway: sharing?.allowAway ?? false,
                members: Array.isArray(sharing?.members) ? sharing.members.length : 0,
            };
        }),
        playing: playing ? { ownerId: playingOwner, slot: playing.slot, owner: people[playingOwner] } : null,
        purchases: purchases.map((purchase) => describePurchase(purchase, people)),
    });
});

// Bans them for `days`, or for good if days is null, and kicks them from the server they're in: through Roblox for a
// game that bans that way (Roblox evicts them), or in the database, telling the live servers
playersRouter.post('/:userId/ban', async (req, res) => {
    const { game } = req;
    const { userId } = req.params;
    const reason = readReason(req.body?.reason);
    const days = req.body?.days ?? null;

    if (userId === String(req.session.userId)) return res.status(400).json({ error: 'You can\'t ban yourself' });
    if (!reason) return res.status(400).json({ error: `Give a reason, at most ${MAX_REASON} characters: they're shown it` });
    if (days !== null && !(Number.isInteger(days) && days >= 1 && days <= MOST_BAN_DAYS))
        return res.status(400).json({ error: `days must be a whole number from 1 to ${MOST_BAN_DAYS}, or null for good` });

    if (robloxBans.usesRobloxBans(game)) {
        await robloxBans.ban(game, userId, { reason, days, by: `user ${req.session.userId}` });
        audit(req, 'ban', { game: game.slug, userId, reason, days: days ?? 'forever', through: 'roblox' });
        return res.json({ ok: true, told: true });
    }

    const expiresAt = days !== null ? new Date(Date.now() + days * DAY_MS) : null;
    await GameMembership.ban(game.id, userId, { reason, expiresAt });
    audit(req, 'ban', { game: game.slug, userId, reason, days: days ?? 'forever' });

    res.json({ ok: true, ...(await tellLiveServers(() => accountChanged(game, userId))) });
});

playersRouter.delete('/:userId/ban', async (req, res) => {
    const { game } = req;
    const { userId } = req.params;

    if (robloxBans.usesRobloxBans(game)) {
        const current = await robloxBans.getBan(game, userId);
        if (!current.isBanned) return res.status(404).json({ error: 'They aren\'t banned' });
        await robloxBans.unban(game, userId);
        audit(req, 'unban', { game: game.slug, userId, through: 'roblox' });
        return res.json({ ok: true });
    }

    try {
        await GameMembership.unban(game.id, userId);
    } catch (err) {
        if (isNotFound(err)) return res.status(404).json({ error: 'They aren\'t banned' });
        throw err;
    }
    audit(req, 'unban', { game: game.slug, userId });
    res.json({ ok: true });
});

playersRouter.post('/:userId/admin', async (req, res) => {
    const { game } = req;
    const { userId } = req.params;

    await GameMembership.makeAdmin(game.id, userId);
    audit(req, 'make admin', { game: game.slug, userId });
    res.json({ ok: true, ...(await tellLiveServers(() => accountChanged(game, userId))) });
});

playersRouter.delete('/:userId/admin', async (req, res) => {
    const { game } = req;
    const { userId } = req.params;

    try {
        await GameMembership.removeAdmin(game.id, userId);
    } catch (err) {
        if (isNotFound(err)) return res.status(404).json({ error: 'They aren\'t an admin' });
        throw err;
    }
    audit(req, 'remove admin', { game: game.slug, userId });
    res.json({ ok: true, ...(await tellLiveServers(() => accountChanged(game, userId))) });
});

// Kicks them from whichever live server they're in, showing the reason; they may come straight back
playersRouter.post('/:userId/kick', async (req, res) => {
    const { game } = req;
    const { userId } = req.params;
    const reason = readReason(req.body?.reason);

    if (!reason) return res.status(400).json({ error: `Give a reason, at most ${MAX_REASON} characters: they're shown it` });

    try {
        await accountChanged(game, userId, reason);
    } catch (err) {
        if (err instanceof PublishError) return res.status(err.status >= 500 ? 502 : 400).json({ error: err.message });
        throw err;
    }
    audit(req, 'kick', { game: game.slug, userId, reason });
    res.json({ ok: true });
});

// Gives them a pass for good, as a gift would: into their ownedProducts, logged as a free purchase, and given at
// once in the server they're in
playersRouter.post('/:userId/products', async (req, res) => {
    const { game } = req;
    const { userId } = req.params;
    const product = findGrantable(game.slug, req.body?.key);
    const statsEntry = STATS_MODELS_BY_SLUG[game.slug];

    if (!product) return res.status(400).json({ error: 'Pick one of this game\'s passes' });
    if (!statsEntry?.fields.includes('ownedProducts'))
        return res.status(400).json({ error: `${game.name} keeps no owned products` });

    const existing = await statsEntry.Model.get(userId);
    const owned = existing?.ownedProducts ?? {};
    if (owned[product.key]) return res.status(409).json({ error: `They already have ${product.name}` });

    const recipient = await User.getOrCreateByRobloxId(userId);
    await statsEntry.Model.upsert(userId, { ownedProducts: { ...owned, [product.key]: true } });
    await Purchase.create({
        gameId: game.id,
        userId: recipient.id,
        recipientId: recipient.id,
        productId: product.productId,
        productType: 'gamepass',
        priceRobux: 0,
        metadata: { source: 'dashboard', grantedBy: String(req.session.userId), productKey: product.key },
    });
    audit(req, 'grant product', { game: game.slug, userId, productKey: product.key });

    res.json({ ok: true, ...(await tellLiveServers(() => productGranted(game, userId, product.key))) });
});

// Takes back a pass given through ownedProducts. It goes when they next join; one bought on Roblox stays theirs,
// since the game asks Roblox too
playersRouter.delete('/:userId/products/:key', async (req, res) => {
    const { game } = req;
    const { userId, key } = req.params;
    const statsEntry = STATS_MODELS_BY_SLUG[game.slug];

    if (!statsEntry?.fields.includes('ownedProducts'))
        return res.status(400).json({ error: `${game.name} keeps no owned products` });

    const existing = await statsEntry.Model.get(userId);
    const owned = { ...(existing?.ownedProducts ?? {}) };
    if (!owned[key]) return res.status(404).json({ error: 'They don\'t have that' });

    delete owned[key];
    await statsEntry.Model.update(userId, { ownedProducts: owned });
    audit(req, 'revoke product', { game: game.slug, userId, productKey: key });
    res.json({ ok: true });
});

module.exports = playersRouter;