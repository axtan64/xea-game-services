const { getClient } = require('../client');

function notFound() {
    const err = new Error('No like found between these users');
    err.code = 'P2025';
    return err;
}

/**
 * One game's likes: a player liking another, purely cosmetic. Every game that has them keeps its own table of the
 * same shape (MiningLike, CutcLike), so a like in one game never counts in another.
 * @param {string} delegate The Prisma client's name for the table (e.g. 'miningLike')
 */
function makeLikeModel(delegate) {
    const table = () => getClient()[delegate];

    return {
        // Has `likingId` liked `userId`?
        async hasLiked(userId, likingId) {
            const like = await table().findUnique({
                where: { userId_likingId: { userId: BigInt(userId), likingId: BigInt(likingId) } },
            });

            return like !== null;
        },

        // How many likes does `userId` have?
        countFor(userId) {
            return table().count({ where: { userId: BigInt(userId) } });
        },

        // Create a like from `likingId` to `userId`
        create(userId, likingId) {
            userId = BigInt(userId);
            likingId = BigInt(likingId);

            return table().upsert({
                where: { userId_likingId: { userId, likingId } },
                create: { userId, likingId },
                update: {},
            });
        },

        // Remove a like from `likingId` to `userId`.
        async remove(userId, likingId) {
            try {
                return await table().delete({
                    where: { userId_likingId: { userId: BigInt(userId), likingId: BigInt(likingId) } },
                });
            } catch (err) {
                if (err.code === 'P2025')
                    throw notFound();

                throw err;
            }
        },

        /**
         * Paged list of players who have liked `userId`, newest first
         * @param {BigInt} userId ID of the player being liked
         * @param {Object} options Options for pagination
         * @param {number} options.page Page number (default: 1)
         * @param {number} options.pageSize Number of results per page (default: 10)
         */
        listLikers(userId, { page = 1, pageSize = 10 } = {}) {
            return table().findMany({
                where: { userId: BigInt(userId) },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            });
        },
    };
}

module.exports = { makeLikeModel };