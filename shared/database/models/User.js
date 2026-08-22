const { getClient } = require('../client');

class User {
    static get(id) {
        return getClient().user.findUnique({ where: { id } });
    }

    static getByRobloxId(robloxId) {
        return getClient().user.findUnique({ where: { robloxId: BigInt(robloxId) } });
    }

    static save({ robloxId, ...rest }) {
        robloxId = BigInt(robloxId);

        return getClient().user.upsert({
            where: { robloxId },
            create: { robloxId, ...rest },
            update: rest,
        });
    }

    // Fetch / create with no other fields
    static getOrCreateByRobloxId(robloxId) {
        return User.save({ robloxId });
    }
}

module.exports = User;
