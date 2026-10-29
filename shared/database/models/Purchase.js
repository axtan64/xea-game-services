const { getClient } = require('../client');

class Purchase {
    static get(id) {
        return getClient().purchase.findUnique({ where: { id } });
    }

    static findByReceiptId(robloxReceiptId) {
        if (!robloxReceiptId) return null;
        return getClient().purchase.findUnique({ where: { robloxReceiptId } });
    }

    static create({ gameId, userId, productId, priceRobux, ...rest }) {
        return getClient().purchase.create({
            data: { gameId, userId, productId: BigInt(productId), priceRobux, ...rest },
        });
    }

    // Update / create a purchase by its Roblox receipt ID
    static upsertByReceiptId({ gameId, userId, recipientId, productId, productType, priceRobux, robloxReceiptId, metadata }) {
        if (!robloxReceiptId) {
            return Purchase.create({ gameId, userId, recipientId, productId, productType, priceRobux, metadata });
        }

        return getClient().purchase.upsert({
            where: { robloxReceiptId },
            create: {
                gameId, userId, recipientId: recipientId ?? null,
                productId: BigInt(productId), productType, priceRobux, robloxReceiptId, metadata,
            },
            update: {},
        });
    }

    static findByUser(userId) {
        return getClient().purchase.findMany({
            where: { userId },
            orderBy: { purchasedAt: 'desc' },
        });
    }

    static findByRecipient(recipientId) {
        return getClient().purchase.findMany({
            where: { recipientId },
            orderBy: { purchasedAt: 'desc' },
        });
    }
}

module.exports = Purchase;
