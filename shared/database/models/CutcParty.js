const { getClient } = require('../client');

// A party nobody collected within a day was never played: its reserved server is long gone
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * A party on its way from Clean Up The City's lobby to the reserved server that will play a save slot. The lobby
 * writes it under the reserved server's ID just before teleporting; the reserved server reads it as it starts,
 * to learn whose slot it plays and who may join. Teleport data is never trusted for this.
 */
class CutcParty {
    // Create or replace the manifest for a reserved server, and clear out old ones while here
    static async put(serverId, { ownerId, slot, members, accessCode }) {
        const client = getClient();
        const data = { ownerId: BigInt(ownerId), slot, members, accessCode: accessCode ?? null, createdAt: new Date() };

        await client.cutcParty.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - MAX_AGE_MS) } } });

        return client.cutcParty.upsert({ where: { serverId }, create: { serverId, ...data }, update: data });
    }

    static get(serverId) {
        return getClient().cutcParty.findUnique({ where: { serverId } });
    }

    // The newest party for a slot that set off within `withinMs`: its server may not have taken the lock yet
    static findLaunching(ownerId, slot, withinMs) {
        return getClient().cutcParty.findFirst({
            where: {
                ownerId: BigInt(ownerId),
                slot,
                accessCode: { not: null },
                createdAt: { gt: new Date(Date.now() - withinMs) },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // False if there was none
    static async remove(serverId) {
        const { count } = await getClient().cutcParty.deleteMany({ where: { serverId } });
        return count === 1;
    }
}

module.exports = CutcParty;