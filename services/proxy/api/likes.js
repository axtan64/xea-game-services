const { Router } = require('express');
const { getGameLikes } = require('../lib/roblox');

const likesRouter = Router();

/**
 * @swagger
 * /likes/{universeId}:
 *   get:
 *     summary: Get a game's like/dislike counts
 *     description: Retrieves upvote/downvote counts for a game via a rotating proxy.
 *     tags:
 *       - Likes
 *     parameters:
 *       - in: path
 *         name: universeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Roblox universe ID
 *     responses:
 *       200:
 *         description: Vote counts retrieved successfully
 *       404:
 *         description: Game not found
 *       502:
 *         description: Could not reach the Roblox API through any proxy
 */
likesRouter.get('/:universeId', async (req, res) => {
    const { universeId } = req.params;

    try {
        const votes = await getGameLikes(universeId);

        if (!votes)
            return res.status(404).json({ error: 'Game not found' });

        res.json(votes);
    } catch (err) {
        console.error('Error fetching game likes:', err);
        res.status(502).json({ error: 'Failed to reach Roblox API' });
    }
});

module.exports = likesRouter;
