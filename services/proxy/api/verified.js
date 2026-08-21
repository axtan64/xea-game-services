const { Router } = require('express');
const { hasVerifiedBadge } = require('../lib/roblox');

const verifiedRouter = Router();

/**
 * @swagger
 * /verified/{userId}:
 *   get:
 *     summary: Check if a user has Roblox's verified badge
 *     description: Retrieves a user's profile via a rotating proxy and reads its hasVerifiedBadge flag.
 *     tags:
 *       - Verified
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Roblox user ID
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
 *                 verified:
 *                   type: boolean
 *       404:
 *         description: User not found
 *       502:
 *         description: Could not reach the Roblox API through any proxy
 */
verifiedRouter.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const verified = await hasVerifiedBadge(userId);

        if (verified === null)
            return res.status(404).json({ error: 'User not found' });

        res.json({ userId, verified });
    } catch (err) {
        console.error('Error checking verified badge:', err);
        res.status(502).json({ error: 'Failed to reach Roblox API' });
    }
});

module.exports = verifiedRouter;
