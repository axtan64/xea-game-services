const { Router } = require('express');
const { isFollowing } = require('../lib/roblox');

const followingRouter = Router();

/**
 * @swagger
 * /following:
 *   get:
 *     summary: Check if a user follows another user
 *     description: Pages through the source user's followings list via rotating proxies until the target is found or the list is exhausted.
 *     tags:
 *       - Following
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Roblox ID of the user whose followings are checked
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Roblox ID being searched for
 *     responses:
 *       200:
 *         description: Lookup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 targetId:
 *                   type: string
 *                 following:
 *                   type: boolean
 *       400:
 *         description: Missing required query parameters
 *       502:
 *         description: Could not reach the Roblox API through any proxy
 */
followingRouter.get('/', async (req, res) => {
    const { userId, targetId } = req.query;

    if (!userId || !targetId)
        return res.status(400).json({ error: 'userId and targetId are required' });

    try {
        const following = await isFollowing(userId, targetId);
        res.json({ userId, targetId, following });
    } catch (err) {
        console.error('Error checking following status:', err);
        res.status(502).json({ error: 'Failed to reach Roblox API' });
    }
});

module.exports = followingRouter;
