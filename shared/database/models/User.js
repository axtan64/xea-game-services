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

    // expiresAt: null/undefined bans permanently, otherwise a Date the ban lifts on its own.
    // Upserts since a user may never have had a User row (e.g. no purchases yet) before being banned.
    static ban(robloxId, { reason = null, expiresAt = null } = {}) {
        robloxId = BigInt(robloxId);
        const data = { bannedAt: new Date(), banReason: reason, banExpiresAt: expiresAt };

        return getClient().user.upsert({
            where: { robloxId },
            create: { robloxId, ...data },
            update: data,
        });
    }

    static unban(robloxId) {
        return getClient().user.update({
            where: { robloxId: BigInt(robloxId) },
            data: { bannedAt: null, banReason: null, banExpiresAt: null },
        });
    }

    // Upserts since a user may never have had a User row before being made admin.
    static makeAdmin(robloxId) {
        robloxId = BigInt(robloxId);

        return getClient().user.upsert({
            where: { robloxId },
            create: { robloxId, isAdmin: true },
            update: { isAdmin: true },
        });
    }

    static removeAdmin(robloxId) {
        return getClient().user.update({
            where: { robloxId: BigInt(robloxId) },
            data: { isAdmin: false },
        });
    }
}

module.exports = User;
