const { Router } = require('express');
const { getRobloxBadges } = require('../lib/roblox');

const robloxBadgesRouter = Router();

/**
 * @swagger
 * /roblox-badges/{userId}:
 *   get:
 *     summary: Get a user's official Roblox badges (Administrator, Verified, etc.)
 *     description: Extends the Roblox API - proxies accountinformation.roblox.com's roblox-badges endpoint via a rotating proxy.
 *     tags:
 *       - Roblox Badges
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
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   imageUrl:
 *                     type: string
 *       502:
 *         description: Could not reach the Roblox API through any proxy
 */
robloxBadgesRouter.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const badges = await getRobloxBadges(userId);
        res.json(badges);
    } catch (err) {
        console.error('Error fetching Roblox badges:', err);
        res.status(502).json({ error: 'Failed to reach Roblox API' });
    }
});

module.exports = robloxBadgesRouter;
