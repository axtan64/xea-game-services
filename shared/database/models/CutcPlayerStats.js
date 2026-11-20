const { getClient } = require('../client');
const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['timePlayed', 'settings', 'ownedProducts', 'cash', 'contractTokens', 'litterIndex', 'classes', 'equippedClass', 'easterEggs', 'litterPickedUp', 'tilesCleaned', 'cashEarned', 'cosmetics', 'dailies', 'seen', 'peoplePushed', 'propsToppled', 'robuxSpent', 'playerColor', 'explosives'];
// The lifetime stats the lobby's leaderboards may rank players by
const RANKED_FIELDS = ['tilesCleaned', 'litterPickedUp', 'cashEarned'];
// What each place on a player board carries besides its own figure: the lifetime stats and play time, for the line
// the lobby opens under a row
const BOARD_FIELDS = { robloxId: true, tilesCleaned: true, litterPickedUp: true, cashEarned: true, timePlayed: true };

class CutcPlayerStats extends createPlayerStatsModel('cutcPlayerStats', STAT_FIELDS) {
    // The players with the most of a lifetime stat, most first: [{ robloxId, tilesCleaned, litterPickedUp,
    // cashEarned, timePlayed }]
    static top(field, limit) {
        if (!RANKED_FIELDS.includes(field))
            throw new Error(`${field} is not a ranked stat`);

        return getClient().cutcPlayerStats.findMany({
            where: { [field]: { gt: 0 } },
            orderBy: [{ [field]: 'desc' }, { robloxId: 'asc' }],
            take: limit,
            select: BOARD_FIELDS,
        });
    }

    // Where a player stands on a ranked stat's board, 1 for the top (ties go to the lower id, as in top), or null
    // with none of it. One count over the stat's index of the players above them
    static async rank(field, robloxId) {
        if (!RANKED_FIELDS.includes(field))
            throw new Error(`${field} is not a ranked stat`);

        const client = getClient();
        const id = BigInt(robloxId);
        const row = await client.cutcPlayerStats.findUnique({ where: { robloxId: id }, select: { [field]: true } });
        const mine = row?.[field] ?? 0;
        if (!(mine > 0)) return null;

        const above = await client.cutcPlayerStats.count({
            where: { OR: [{ [field]: { gt: mine } }, { [field]: mine, robloxId: { lt: id } }] },
        });
        return above + 1;
    }
}

module.exports = { CutcPlayerStats, STAT_FIELDS, RANKED_FIELDS };