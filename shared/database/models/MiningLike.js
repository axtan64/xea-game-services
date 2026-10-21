const { getClient } = require('../client');

function notFound() {
    const err = new Error('No like found between these users');
    err.code = 'P2025';
    return err;
}

class MiningLike {
    // Has `likingId` liked `userId`?
    static async hasLiked(userId, likingId) {
        const like = await getClient().miningLike.findUnique({
            where: { userId_likingId: { userId: BigInt(userId), likingId: BigInt(likingId) } },
        });

        return like !== null;
    }

    // How many likes does `userId` have?
    static countFor(userId) {
        return getClient().miningLike.count({ where: { userId: BigInt(userId) } });
    }

    // Create a like from `likingId` to `userId`
    static create(userId, likingId) {
        userId = BigInt(userId);
        likingId = BigInt(likingId);

        return getClient().miningLike.upsert({
            where: { userId_likingId: { userId, likingId } },
            create: { userId, likingId },
            update: {},
        });
    }

    // Remove a like from `likingId` to `userId`.
    static async remove(userId, likingId) {
        try {
            return await getClient().miningLike.delete({
                where: { userId_likingId: { userId: BigInt(userId), likingId: BigInt(likingId) } },
            });
        } catch (err) {
            if (err.code === 'P2025')
                throw notFound();

            throw err;
        }
    }

    /**
     * Paged list of players who have liked `userId`, newest first
     * @param {BigInt} userId ID of the player being liked
     * @param {Object} options Options for pagination
     * @param {number} options.page Page number (default: 1)
     * @param {number} options.pageSize Number of results per page (default: 10)
     */
    static listLikers(userId, { page = 1, pageSize = 10 } = {}) {
        return getClient().miningLike.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
    }
}

module.exports = MiningLike;