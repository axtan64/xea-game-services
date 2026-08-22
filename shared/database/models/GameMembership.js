const { getClient } = require('../client');
const User = require('./User');

function notFound() {
    const err = new Error('No membership found for this user in this game');
    err.code = 'P2025';
    return err;
}

class GameMembership {
    static async get(gameId, robloxId) {
        const user = await User.getByRobloxId(robloxId);

        if (!user)
            return null;

        return getClient().gameMembership.findUnique({ where: { gameId_userId: { gameId, userId: user.id } } });
    }

    // Upserts the underlying User row too - a user may never have been seen before being banned/made admin
    static async ban(gameId, robloxId, { reason = null, expiresAt = null } = {}) {
        const user = await User.getOrCreateByRobloxId(robloxId);
        const data = { bannedAt: new Date(), banReason: reason, banExpiresAt: expiresAt };

        return getClient().gameMembership.upsert({
            where: { gameId_userId: { gameId, userId: user.id } },
            create: { gameId, userId: user.id, ...data },
            update: data,
        });
    }

    static async unban(gameId, robloxId) {
        const membership = await GameMembership.get(gameId, robloxId);

        if (!membership)
            throw notFound();

        return getClient().gameMembership.update({
            where: { id: membership.id },
            data: { bannedAt: null, banReason: null, banExpiresAt: null },
        });
    }

    static async makeAdmin(gameId, robloxId) {
        const user = await User.getOrCreateByRobloxId(robloxId);

        return getClient().gameMembership.upsert({
            where: { gameId_userId: { gameId, userId: user.id } },
            create: { gameId, userId: user.id, isAdmin: true },
            update: { isAdmin: true },
        });
    }

    static async removeAdmin(gameId, robloxId) {
        const membership = await GameMembership.get(gameId, robloxId);

        if (!membership)
            throw notFound();

        return getClient().gameMembership.update({
            where: { id: membership.id },
            data: { isAdmin: false },
        });
    }
}

module.exports = GameMembership;