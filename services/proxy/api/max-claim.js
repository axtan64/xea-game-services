const { Router } = require('express');
const { getAllGamepasses } = require('../lib/roblox');
const { findBestCombination } = require('../lib/gamepassMath');

const maxClaimRouter = Router();

const MAX_AIM_AMOUNT = 1_000_000;
const MAX_GAMEPASSES_CAP = 50;

/**
 * @swagger
 * components:
 *   schemas:
 *     MaxClaimGamepass:
 *       type: object
 *       properties:
 *         id: { type: number }
 *         name: { type: string }
 *         price: { type: number }
 *         universeId: { type: number }
 *         gameName: { type: string }
 */

/**
 * @swagger
 * /max-claim/{userId}:
 *   post:
 *     summary: Find the best combination of a player's gamepasses to buy towards a target amount
 *     description: >
 *       Searches every gamepass across the player's public games (each reusable any number of
 *       times) for the combination that gets as close as possible to aimAmount without exceeding
 *       it, using as few gamepasses as possible, and never more than maxGamepasses.
 *     tags:
 *       - MaxClaim
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aimAmount, maxGamepasses]
 *             properties:
 *               aimAmount:
 *                 type: number
 *                 description: Target Robux sum - never exceeded
 *               maxGamepasses:
 *                 type: number
 *                 description: Maximum number of gamepasses allowed in the result
 *     responses:
 *       200:
 *         description: Best combination found (may be short of aimAmount if the player's gamepasses can't reach it)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPrice: { type: number }
 *                 gamepasses:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/MaxClaimGamepass' }
 *       400:
 *         description: Invalid body
 *       502:
 *         description: Could not reach the Roblox API through any proxy
 */
maxClaimRouter.post('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { aimAmount, maxGamepasses } = req.body ?? {};

    if (!Number.isInteger(aimAmount) || aimAmount < 0 || aimAmount > MAX_AIM_AMOUNT)
        return res.status(400).json({ error: `aimAmount must be an integer between 0 and ${MAX_AIM_AMOUNT}` });

    if (!Number.isInteger(maxGamepasses) || maxGamepasses < 1 || maxGamepasses > MAX_GAMEPASSES_CAP)
        return res.status(400).json({ error: `maxGamepasses must be an integer between 1 and ${MAX_GAMEPASSES_CAP}` });

    if (aimAmount === 0)
        return res.json({ totalPrice: 0, gamepasses: [] });

    try {
        const gamepasses = await getAllGamepasses(userId);
        const { totalPrice, chosen } = findBestCombination(gamepasses, aimAmount, maxGamepasses);

        res.json({ totalPrice, gamepasses: chosen });
    } catch (err) {
        console.error(`Error computing max claim for userId ${userId}:`, err);
        res.status(502).json({ error: 'Failed to reach Roblox API' });
    }
});

module.exports = maxClaimRouter;