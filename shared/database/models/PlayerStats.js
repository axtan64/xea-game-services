const { getClient } = require('../client');

const STAT_FIELDS = ['level', 'gold', 'highestLevel', 'selectedLevel', 'progress', 'totalBlocksMined'];

class UnknownStatFieldError extends Error {
    constructor(fields) {
        super(`Unknown stat field(s): ${fields.join(', ')}`);
        this.fields = fields;
    }
}

// Only lets recognized stat columns through - blocks a caller from smuggling in
// e.g. robloxId to reassign the primary key, and catches typo'd stat names loudly
// instead of silently dropping them.
function sanitizeStats(data = {}) {
    const unknown = Object.keys(data).filter((key) => !STAT_FIELDS.includes(key));

    if (unknown.length > 0)
        throw new UnknownStatFieldError(unknown);

    return STAT_FIELDS.reduce((stats, key) => {
        if (data[key] !== undefined) stats[key] = data[key];
        return stats;
    }, {});
}

class PlayerStats {
    static get(robloxId) {
        return getClient().playerStats.findUnique({ where: { robloxId: BigInt(robloxId) } });
    }

    static create(robloxId, data) {
        const stats = sanitizeStats(data);
        return getClient().playerStats.create({ data: { robloxId: BigInt(robloxId), ...stats } });
    }

    // Create-if-missing, merge-only-given-fields if it already exists.
    static async upsert(robloxId, data) {
        const stats = sanitizeStats(data);
        const id = BigInt(robloxId);

        return getClient().playerStats.upsert({
            where: { robloxId: id },
            create: { robloxId: id, ...stats },
            update: stats,
        });
    }

    static update(robloxId, data) {
        const stats = sanitizeStats(data);
        return getClient().playerStats.update({ where: { robloxId: BigInt(robloxId) }, data: stats });
    }

    static delete(robloxId) {
        return getClient().playerStats.delete({ where: { robloxId: BigInt(robloxId) } });
    }
}

module.exports = { PlayerStats, STAT_FIELDS, UnknownStatFieldError };
