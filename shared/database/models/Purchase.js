const { getClient } = require('../client');

class Purchase {
    static get(id) {
        return getClient().purchase.findUnique({ where: { id } });
    }

    static create({ gameId, userId, productId, priceRobux, ...rest }) {
        return getClient().purchase.create({
            data: { gameId, userId, productId: BigInt(productId), priceRobux, ...rest },
        });
    }

    static findByUser(userId) {
        return getClient().purchase.findMany({
            where: { userId },
            orderBy: { purchasedAt: 'desc' },
        });
    }
}

module.exports = Purchase;
