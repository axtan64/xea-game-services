const { getClient } = require('../client');

// What the lobby shows of a slot: everything but the save itself, which can be large
const SUMMARY = {
    ownerId: true,
    slot: true,
    version: true,
    cleanShare: true,
    cash: true,
    partySize: true,
    playTime: true,
    finishedIn: true,
    lastPlayedAt: true,
    lockId: true,
    lockedAt: true,
    serverId: true,
    accessCode: true,
    playerCount: true,
    maxPlayers: true,
    ownerPresent: true,
    createdAt: true,
    updatedAt: true,
};

// The summary fields a save may carry, and the type each must be
const SUMMARY_FIELDS = { cleanShare: 'number', cash: 'number', partySize: 'number', playTime: 'number', finishedIn: 'number' };

// Keeps the first (best) entry for each owner, up to `limit`, so one player's three cities don't fill a board
function onePerOwner(rows, limit) {
    const seen = new Set();
    const kept = [];

    for (const row of rows) {
        const owner = String(row.ownerId);
        if (seen.has(owner)) continue;

        seen.add(owner);
        kept.push(row);
        if (kept.length >= limit) break;
    }

    return kept;
}

const key = (ownerId, slot) => ({ ownerId: BigInt(ownerId), slot });

// The most players any city holds, whatever its server says (the game's 100-player pass; Roblox's own limit)
const MOST_PLAYERS = 100;

// A lock nobody has refreshed for `staleMs` no longer holds: its server crashed or was shut without saving
const staleBefore = (staleMs) => new Date(Date.now() - staleMs);

const isUserId = (value) => Number.isSafeInteger(value) && value > 0;

// Who a server says is in its city, as columns; nothing if it didn't say
function readPresence(presence) {
    const fields = {};

    if (Number.isInteger(presence?.playerCount) && presence.playerCount >= 0) fields.playerCount = presence.playerCount;
    if (Number.isInteger(presence?.maxPlayers) && presence.maxPlayers >= 1 && presence.maxPlayers <= MOST_PLAYERS)
        fields.maxPlayers = presence.maxPlayers;
    if (typeof presence?.ownerPresent === 'boolean') fields.ownerPresent = presence.ownerPresent;
    if (Array.isArray(presence?.players) && presence.players.length <= MOST_PLAYERS && presence.players.every(isUserId))
        fields.players = presence.players.map(String);

    return fields;
}

// What a slot with no live session has in its session columns
const NO_SESSION = { serverId: null, accessCode: null, playerCount: 0, ownerPresent: false, players: [] };

/**
 * A player's save slots in Clean Up The City. A slot is a whole city (the game's own JSON blob, opaque here) plus
 * a short summary for the lobby, and a session lock so only one game server plays it at a time.
 */
class CutcSaveSlot {
    // Every slot the player has, without the saves
    static list(ownerId) {
        return getClient().cutcSaveSlot.findMany({
            where: { ownerId: BigInt(ownerId) },
            select: SUMMARY,
            orderBy: { slot: 'asc' },
        });
    }

    // The summaries of several slots at once, each named by { ownerId, slot }
    static summaries(keys) {
        if (keys.length === 0) return [];

        return getClient().cutcSaveSlot.findMany({
            where: { OR: keys.map(({ ownerId, slot }) => key(ownerId, slot)) },
            select: SUMMARY,
        });
    }

    // The cities that met their last milestone in the least play time, one per owner
    static async fastest(limit) {
        const rows = await getClient().cutcSaveSlot.findMany({
            where: { finishedIn: { gt: 0 } },
            orderBy: [{ finishedIn: 'asc' }, { updatedAt: 'asc' }],
            take: limit * 3,
            select: { ownerId: true, slot: true, finishedIn: true, playTime: true, cleanShare: true },
        });

        return onePerOwner(rows, limit);
    }

    // Where an owner's best city stands on the fastest board, 1 for the top, or null if they aren't on it. One count
    // over an indexed column of the owners whose best city beats theirs, so it costs about as much as there are
    // cities above it, and nothing is kept between asks
    static async ranks(ownerId) {
        const client = getClient();
        const fast = await client.cutcSaveSlot.findFirst({
            where: { ownerId: BigInt(ownerId), finishedIn: { gt: 0 } },
            orderBy: [{ finishedIn: 'asc' }, { updatedAt: 'asc' }],
            select: { finishedIn: true, updatedAt: true },
        });
        if (!fast) return { fastest: null };

        const [{ above }] = await client.$queryRaw`
            SELECT COUNT(DISTINCT "ownerId")::int AS "above" FROM "CutcSaveSlot"
            WHERE "finishedIn" > 0 AND ("finishedIn" < ${fast.finishedIn}
                OR ("finishedIn" = ${fast.finishedIn} AND "updatedAt" < ${fast.updatedAt}))`;
        return { fastest: above + 1 };
    }

    // Every city being played now, newest lock first, with who is in it: for the dashboard's live cities
    static live(staleMs) {
        return getClient().cutcSaveSlot.findMany({
            where: { lockId: { not: null }, lockedAt: { gt: staleBefore(staleMs) } },
            select: { ...SUMMARY, players: true },
            orderBy: { lockedAt: 'desc' },
        });
    }

    // The live city a player is in, as its server last said with a save or heartbeat, or null. For an admin's
    // /join: the newest lock wins, should a stale entry linger after a crash
    static playing(userId, staleMs) {
        return getClient().cutcSaveSlot.findFirst({
            where: {
                players: { array_contains: [String(userId)] },
                lockId: { not: null },
                lockedAt: { gt: staleBefore(staleMs) },
            },
            orderBy: { lockedAt: 'desc' },
            select: { ownerId: true, slot: true },
        });
    }

    static summary(ownerId, slot) {
        return getClient().cutcSaveSlot.findUnique({ where: { ownerId_slot: key(ownerId, slot) }, select: SUMMARY });
    }

    static get(ownerId, slot) {
        return getClient().cutcSaveSlot.findUnique({ where: { ownerId_slot: key(ownerId, slot) } });
    }

    /**
     * Take the slot's lock for a server, creating the slot (with no save yet) if the player has never used it.
     * Succeeds if nobody holds it, the same server already does, or the holder has gone stale.
     * @param {{ serverId?: string, accessCode?: string }} session The reserved server taking the lock and the
     *     code it was reserved with, so the lobby can send others into the city while it is played
     * @returns {{ acquired: boolean, slot: object }} The slot as it now stands; `acquired` false means another
     *     server holds a live lock, and `slot.lockId`/`slot.lockedAt` say which and since when
     */
    static async lock(ownerId, slot, lockId, staleMs, session = {}) {
        const where = key(ownerId, slot);
        const client = getClient();

        await client.cutcSaveSlot.upsert({ where: { ownerId_slot: where }, create: where, update: {} });

        // One conditional write, so two servers asking at once can't both win
        const { count } = await client.cutcSaveSlot.updateMany({
            where: {
                ...where,
                OR: [{ lockId: null }, { lockId }, { lockedAt: null }, { lockedAt: { lt: staleBefore(staleMs) } }],
            },
            data: {
                lockId,
                lockedAt: new Date(),
                serverId: session.serverId ?? null,
                accessCode: session.accessCode ?? null,
            },
        });

        return { acquired: count === 1, slot: await CutcSaveSlot.get(ownerId, slot) };
    }

    /**
     * Write the save, if `lockId` holds the lock. Also refreshes the lock, so autosaves keep it alive.
     * @returns {object|null} The slot's new summary, or null if the lock isn't this server's
     */
    static async save(ownerId, slot, lockId, data, summary = {}, presence = {}) {
        const fields = {};
        for (const [name, type] of Object.entries(SUMMARY_FIELDS))
            if (typeof summary[name] === type && Number.isFinite(summary[name])) fields[name] = summary[name];

        const now = new Date();
        const { count } = await getClient().cutcSaveSlot.updateMany({
            where: { ...key(ownerId, slot), lockId },
            data: { data, ...fields, ...readPresence(presence), version: { increment: 1 }, lastPlayedAt: now, lockedAt: now },
        });

        if (count === 0) return null;

        return getClient().cutcSaveSlot.findUnique({ where: { ownerId_slot: key(ownerId, slot) }, select: SUMMARY });
    }

    // Keep the lock alive without saving, and say who is in the city. False if it isn't this server's
    static async heartbeat(ownerId, slot, lockId, presence = {}) {
        const { count } = await getClient().cutcSaveSlot.updateMany({
            where: { ...key(ownerId, slot), lockId },
            data: { lockedAt: new Date(), ...readPresence(presence) },
        });

        return count === 1;
    }

    // Let go of the lock. False if it wasn't this server's (already released, or taken over)
    static async unlock(ownerId, slot, lockId) {
        const { count } = await getClient().cutcSaveSlot.updateMany({
            where: { ...key(ownerId, slot), lockId },
            data: { lockId: null, lockedAt: null, ...NO_SESSION },
        });

        return count === 1;
    }

    // Delete the slot so a new city can start in it. False if a server is playing it (or there was none)
    static async remove(ownerId, slot, staleMs) {
        const { count } = await getClient().cutcSaveSlot.deleteMany({
            where: {
                ...key(ownerId, slot),
                OR: [{ lockId: null }, { lockedAt: null }, { lockedAt: { lt: staleBefore(staleMs) } }],
            },
        });

        return count === 1;
    }
}

module.exports = CutcSaveSlot;