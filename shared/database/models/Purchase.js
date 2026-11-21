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

    // One purchase with the Roblox IDs of who bought it and for whom: for the dashboard's delete
    static getWithPeople(id) {
        return getClient().purchase.findUnique({
            where: { id },
            include: { user: { select: { robloxId: true } }, recipient: { select: { robloxId: true } } },
        });
    }

    // Deletes a purchase's record, and nothing it gave. False if it was already gone
    static async remove(id) {
        const { count } = await getClient().purchase.deleteMany({ where: { id } });
        return count === 1;
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

    // The newest purchases, with who bought them, for whom and in which game: for the dashboard's log. `robloxId`
    // narrows them to those that user made or was given
    static recent({ gameId, robloxId, take = 50 } = {}) {
        const who = robloxId != null ? { robloxId: BigInt(robloxId) } : null;

        return getClient().purchase.findMany({
            where: {
                ...(gameId && { gameId }),
                ...(who && { OR: [{ user: who }, { recipient: who }] }),
            },
            include: {
                user: { select: { robloxId: true } },
                recipient: { select: { robloxId: true } },
                game: { select: { slug: true } },
            },
            orderBy: { purchasedAt: 'desc' },
            take,
        });
    }

    // How many sales there were since `since`, and the Robux they took. Grants (no price) aren't sales
    static async totalSince(since, gameId) {
        const result = await getClient().purchase.aggregate({
            where: { purchasedAt: { gte: since }, priceRobux: { gt: 0 }, ...(gameId && { gameId }) },
            _count: { _all: true },
            _sum: { priceRobux: true },
        });

        return { count: result._count._all, robux: result._sum.priceRobux ?? 0 };
    }
}

module.exports = Purchase;
