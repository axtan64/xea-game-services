const { getClient } = require('../client');
const { hashGatewayToken } = require('../lib/hashToken');

class Game {
    static findAll() {
        return getClient().game.findMany();
    }

    static getById(id) {
        return getClient().game.findUnique({ where: { id } });
    }

    static getBySlug(slug) {
        return getClient().game.findUnique({ where: { slug } });
    }

    // gatewayToken is the raw token - only ever persisted hashed, see lib/hashToken.js
    static create({ slug, name, gatewayToken, robloxUniverseId, robloxOpenCloudApiKey }) {
        return getClient().game.create({
            data: {
                slug,
                name,
                gatewayTokenHash: hashGatewayToken(gatewayToken),
                robloxUniverseId: robloxUniverseId != null ? BigInt(robloxUniverseId) : null,
                robloxOpenCloudApiKey: robloxOpenCloudApiKey ?? null,
            },
        });
    }

    /**
     * Set a new gateway token for the game. The token is hashed before being persisted, so the raw token is never stored in the database.
     * @param {string} slug The slug (identifier) of the game to update.
     * @param {string} gatewayToken The new raw gateway token to set for the game (will be hashed).
     * @returns {Promise} A promise that resolves to the updated game record.
     */
    static rotateToken(slug, gatewayToken) {
        return getClient().game.update({
            where: { slug },
            data: { gatewayTokenHash: hashGatewayToken(gatewayToken) },
        });
    }

    /**
     * Records a count of players in the game at once as its peak, if it beats the one stored.
     * @param {string} id The game's id.
     * @param {number} playing How many players Roblox says are in it.
     * @param {Date} at When Roblox said so.
     * @returns {Promise<boolean>} Whether it was a new peak.
     */
    static async raisePeakCcu(id, playing, at = new Date()) {
        const { count } = await getClient().game.updateMany({
            where: { id, peakCcu: { lt: playing } },
            data: { peakCcu: playing, peakCcuAt: at },
        });
        return count > 0;
    }

    static update(slug, { name, robloxUniverseId, robloxOpenCloudApiKey }) {
        return getClient().game.update({
            where: { slug },
            data: {
                ...(name !== undefined && { name }),
                ...(robloxUniverseId !== undefined && { robloxUniverseId: robloxUniverseId != null ? BigInt(robloxUniverseId) : null }),
                ...(robloxOpenCloudApiKey !== undefined && { robloxOpenCloudApiKey }),
            },
        });
    }
}

module.exports = Game;