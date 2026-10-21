const { Router } = require('express');
const { MiningLike } = require('database');

const likesRouter = Router();
const MAX_LIKERS_PAGE_SIZE = 100;

// Filter out non-mining games - likes are a mining-game-specific, purely cosmetic mechanic
likesRouter.use((req, res, next) => {
    if (req.gameSlug !== 'mining')
        return res.status(404).json({ error: 'Not found' });

    next();
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Like:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         userId: { type: string }
 *         likingId: { type: string }
 *         createdAt: { type: string }
 */

/**
 * @swagger
 * /likes/{userId}/count:
 *   get:
 *     summary: Get how many likes a player has
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the player
 *     responses:
 *       200:
 *         description: Count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: number }
 */
likesRouter.get('/:userId/count', async (req, res) => {
    const count = await MiningLike.countFor(req.params.userId);
    res.json({ count });
});

/**
 * @swagger
 * /likes/{userId}/{likingId}:
 *   get:
 *     summary: Check whether likingId has liked userId
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the player being liked
 *       - in: path
 *         name: likingId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the (potential) liker
 *     responses:
 *       200:
 *         description: Like status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked: { type: boolean }
 */
likesRouter.get('/:userId/:likingId', async (req, res) => {
    const liked = await MiningLike.hasLiked(req.params.userId, req.params.likingId);
    res.json({ liked });
});

/**
 * @swagger
 * /likes/{userId}/likers:
 *   post:
 *     summary: Get paged results of the players who have liked a player
 *     description: Roblox-server-only endpoint - page size is caller-controlled via the request body since there's no untrusted client involved.
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the player being liked
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pageSize]
 *             properties:
 *               page: { type: integer, minimum: 1, default: 1 }
 *               pageSize: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Likers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page: { type: integer }
 *                 pageSize: { type: integer }
 *                 likes:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Like' }
 *       400:
 *         description: Invalid body
 */
likesRouter.post('/:userId/likers', async (req, res) => {
    const { page = 1, pageSize } = req.body ?? {};

    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_LIKERS_PAGE_SIZE)
        return res.status(400).json({ error: `pageSize must be an integer between 1 and ${MAX_LIKERS_PAGE_SIZE}` });

    if (!Number.isInteger(page) || page < 1)
        return res.status(400).json({ error: 'page must be a positive integer' });

    const likes = await MiningLike.listLikers(req.params.userId, { page, pageSize });
    res.json({ page, pageSize, likes });
});

/**
 * @swagger
 * /likes/{userId}/{likingId}:
 *   post:
 *     summary: Like a player
 *     description: Idempotent - liking a player you've already liked is a no-op, not an error.
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the player being liked
 *       - in: path
 *         name: likingId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the liker
 *     responses:
 *       200:
 *         description: Like created successfully (or already existed)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Like' }
 */
likesRouter.post('/:userId/:likingId', async (req, res) => {
    const like = await MiningLike.create(req.params.userId, req.params.likingId);
    res.json(like);
});

/**
 * @swagger
 * /likes/{userId}/{likingId}:
 *   delete:
 *     summary: Unlike a player
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the player being unliked
 *       - in: path
 *         name: likingId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the liker
 *     responses:
 *       200:
 *         description: Like removed successfully
 *       404:
 *         description: No like found between these users
 */
likesRouter.delete('/:userId/:likingId', async (req, res) => {
    try {
        const like = await MiningLike.remove(req.params.userId, req.params.likingId);
        res.json(like);
    } catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'No like found between these users' });

        throw err;
    }
});

module.exports = likesRouter;