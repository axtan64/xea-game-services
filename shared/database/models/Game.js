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
    static create({ slug, name, gatewayToken, robloxUniverseId, robloxOpenCloudApiKey, discordWebhookUrl }) {
        return getClient().game.create({
            data: {
                slug,
                name,
                gatewayTokenHash: hashGatewayToken(gatewayToken),
                robloxUniverseId: robloxUniverseId != null ? BigInt(robloxUniverseId) : null,
                robloxOpenCloudApiKey: robloxOpenCloudApiKey ?? null,
                discordWebhookUrl: discordWebhookUrl ?? null,
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

    static update(slug, { name, robloxUniverseId, robloxOpenCloudApiKey, discordWebhookUrl }) {
        return getClient().game.update({
            where: { slug },
            data: {
                ...(name !== undefined && { name }),
                ...(robloxUniverseId !== undefined && { robloxUniverseId: robloxUniverseId != null ? BigInt(robloxUniverseId) : null }),
                ...(robloxOpenCloudApiKey !== undefined && { robloxOpenCloudApiKey }),
                ...(discordWebhookUrl !== undefined && { discordWebhookUrl }),
            },
        });
    }
}

module.exports = Game;