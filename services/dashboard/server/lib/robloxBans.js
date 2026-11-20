// Bans through Roblox's own ban system, Open Cloud's user restrictions (2026-11-20: Clean Up The City bans with
// Players:BanAsync in game, so the dashboard bans the same way, and the Creator Hub's Bans page shows them all).
// Roblox evicts a banned player from any server they're in and turns them away at join with the reason, so no
// message to live servers is needed. Uses the game's Open Cloud key from its Game row, which needs the
// universe.user-restriction:read and :write scopes. Games not listed here still ban through the database
// (GameMembership), which their own servers check.
const ROBLOX_BAN_GAMES = new Set(['cutc']);
const BASE_URL = 'https://apis.roblox.com/cloud/v2';
// Roblox's limits, in characters
const MAX_DISPLAY_REASON = 400;
const MAX_PRIVATE_REASON = 1000;
const DAY_SECONDS = 24 * 60 * 60;
// Bans listed on the Moderation page: pages of 100, at most this many pages
const MOST_LIST_PAGES = 5;

class BanError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

const usesRobloxBans = (game) => ROBLOX_BAN_GAMES.has(game.slug);

function check(game) {
    if (game.robloxUniverseId == null || !game.robloxOpenCloudApiKey)
        throw new BanError(`${game.name} has no universe ID or Open Cloud key yet: set them on the Games page`, 400);
}

async function request(game, method, path, { query, body } = {}) {
    check(game);
    const url = new URL(`${BASE_URL}/universes/${game.robloxUniverseId}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);

    let res;
    try {
        res = await fetch(url, {
            method,
            headers: {
                'x-api-key': game.robloxOpenCloudApiKey,
                ...(body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (err) {
        console.error('Roblox Open Cloud unreachable:', err);
        throw new BanError('Roblox could not be reached');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = data.message || data.error || `HTTP ${res.status}`;
        const hint = res.status === 401 || res.status === 403
            ? ' (does the game\'s Open Cloud key have the universe.user-restriction scopes?)'
            : '';
        throw new BanError(`Roblox refused: ${detail}${hint}`, res.status === 429 ? 429 : 502);
    }
    return data;
}

// "86400s" to seconds; null for none (a ban for good)
function parseDuration(value) {
    if (typeof value !== 'string') return null;
    const seconds = Number.parseFloat(value);
    return Number.isFinite(seconds) ? seconds : null;
}

// A user restriction as the dashboard shows a player's standing: whether they are banned now, since when, why
// and until when
function describeRestriction(restriction) {
    const ban = restriction?.gameJoinRestriction;
    if (!ban?.active) return { isBanned: false, bannedAt: null, banReason: null, banExpiresAt: null, privateReason: null };

    const startTime = ban.startTime ? new Date(ban.startTime) : null;
    const seconds = parseDuration(ban.duration);
    const expiresAt = startTime && seconds !== null ? new Date(startTime.getTime() + seconds * 1000) : null;

    return {
        // A ban whose time is up stays "active" in Roblox's record until it is changed
        isBanned: !expiresAt || expiresAt > new Date(),
        bannedAt: startTime,
        banReason: ban.displayReason ?? null,
        banExpiresAt: expiresAt,
        privateReason: ban.privateReason ?? null,
    };
}

const userIdOf = (restriction) => String(restriction.user ?? '').replace(/^users\//, '');

// A player's ban, as describeRestriction
async function getBan(game, userId) {
    return describeRestriction(await request(game, 'GET', `/user-restrictions/${userId}`));
}

// Bans a player from every place of the game, for `days` or for good (null)
async function ban(game, userId, { reason, days, by }) {
    await request(game, 'PATCH', `/user-restrictions/${userId}`, {
        query: { updateMask: 'gameJoinRestriction' },
        body: {
            gameJoinRestriction: {
                active: true,
                ...(days !== null ? { duration: `${days * DAY_SECONDS}s` } : {}),
                displayReason: reason.slice(0, MAX_DISPLAY_REASON),
                privateReason: `Banned from the dashboard by ${by}: ${reason}`.slice(0, MAX_PRIVATE_REASON),
                excludeAltAccounts: false,
            },
        },
    });
}

async function unban(game, userId) {
    await request(game, 'PATCH', `/user-restrictions/${userId}`, {
        query: { updateMask: 'gameJoinRestriction' },
        body: { gameJoinRestriction: { active: false } },
    });
}

// Everyone banned from the game now, newest first: { userId, ...describeRestriction }
async function listBans(game) {
    const bans = [];
    let pageToken = '';
    for (let page = 0; page < MOST_LIST_PAGES; page += 1) {
        const data = await request(game, 'GET', '/user-restrictions', {
            query: { maxPageSize: '100', ...(pageToken ? { pageToken } : {}) },
        });
        for (const restriction of data.userRestrictions ?? []) {
            const standing = describeRestriction(restriction);
            if (standing.isBanned) bans.push({ userId: userIdOf(restriction), ...standing });
        }
        pageToken = data.nextPageToken;
        if (!pageToken) break;
    }
    return bans.sort((a, b) => (b.bannedAt?.getTime() ?? 0) - (a.bannedAt?.getTime() ?? 0));
}

module.exports = { BanError, usesRobloxBans, getBan, ban, unban, listBans };
