const { getClient } = require('../client');

class UnknownStatFieldError extends Error {
    constructor(fields) {
        super(`Unknown stat field(s): ${fields.join(', ')}`);
        this.fields = fields;
    }
}

// Get the "interface" to interact with user data for a specific Roblox game
function createPlayerStatsModel(prismaModelName, fields) {
    // Scan the user's save file, and remove any stats that don't appear in the respective Prisma Schema
    function sanitize(data = {}) {
        const unknown = Object.keys(data).filter((key) => !fields.includes(key));

        if (unknown.length > 0)
            throw new UnknownStatFieldError(unknown);

        return fields.reduce((stats, key) => {
            if (data[key] !== undefined) stats[key] = data[key];
            return stats;
        }, {});
    }

    const delegate = () => getClient()[prismaModelName];

    return class {
        static get(robloxId) {
            return delegate().findUnique({ where: { robloxId: BigInt(robloxId) } });
        }

        static create(robloxId, data) {
            const stats = sanitize(data);
            return delegate().create({ data: { robloxId: BigInt(robloxId), ...stats } });
        }

        // Create if missing, merge given fields if it already exists.
        static async upsert(robloxId, data) {
            const stats = sanitize(data);
            const id = BigInt(robloxId);

            return delegate().upsert({
                where: { robloxId: id },
                create: { robloxId: id, ...stats },
                update: stats,
            });
        }

        static update(robloxId, data) {
            const stats = sanitize(data);
            return delegate().update({ where: { robloxId: BigInt(robloxId) }, data: stats });
        }

        static delete(robloxId) {
            return delegate().delete({ where: { robloxId: BigInt(robloxId) } });
        }
    };
}

module.exports = { createPlayerStatsModel, UnknownStatFieldError };