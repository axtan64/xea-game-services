const { Router } = require('express');
const { DonationGift } = require('database');

const giftsRouter = Router();

// Filter out non-donation games
giftsRouter.use((req, res, next) => {
    if (req.gameSlug !== 'donation')
        return res.status(404).json({ error: 'Not found' });

    next();
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Gift:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         fromRobloxId: { type: string }
 *         toRobloxId: { type: string }
 *         amount: { type: number }
 *         message: { type: string, nullable: true }
 *         createdAt: { type: string }
 */

/**
 * @swagger
 * /gifts:
 *   post:
 *     summary: Send a Robux gift from one player to another
 *     description: Creates the gift and credits the sender's robuxDonated immediately. The recipient's unclaimedRobux/robuxRaised aren't touched until the gift is claimed (DELETE /gifts/{id}) - it just sits pending until then.
 *     tags: [Gifts]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromRobloxId, toRobloxId, amount]
 *             properties:
 *               fromRobloxId: { type: string }
 *               toRobloxId: { type: string }
 *               amount: { type: number }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Gift sent successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Gift' }
 *       400:
 *         description: Invalid body
 */
giftsRouter.post('/', async (req, res) => {
    const { fromRobloxId, toRobloxId, amount, message } = req.body ?? {};

    if (!fromRobloxId || !toRobloxId)
        return res.status(400).json({ error: 'fromRobloxId and toRobloxId are required' });

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0)
        return res.status(400).json({ error: 'amount must be a positive integer' });

    if (message !== undefined && message !== null && typeof message !== 'string')
        return res.status(400).json({ error: 'message must be a string' });

    const gift = await DonationGift.create({ fromRobloxId, toRobloxId, amount, message });
    res.status(201).json(gift);
});

/**
 * @swagger
 * /gifts/{toRobloxId}:
 *   get:
 *     summary: Get a player's pending (unclaimed) gifts
 *     tags: [Gifts]
 *     parameters:
 *       - in: path
 *         name: toRobloxId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the recipient
 *     responses:
 *       200:
 *         description: Gifts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Gift' }
 */
giftsRouter.get('/:toRobloxId', async (req, res) => {
    const gifts = await DonationGift.listByRecipient(req.params.toRobloxId);
    res.json(gifts);
});

/**
 * @swagger
 * /gifts/{id}:
 *   delete:
 *     summary: Claim a gift
 *     description: Moves the gift's amount into the recipient's unclaimedRobux/robuxRaised, then removes it. Call this when a player successfully claims a gift in-game.
 *     tags: [Gifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Gift claimed successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Gift' }
 *       404:
 *         description: No gift found with this ID
 */
giftsRouter.delete('/:id', async (req, res) => {
    try {
        const gift = await DonationGift.claim(req.params.id);
        res.json(gift);
    } catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'No gift found with this ID' });

        throw err;
    }
});

module.exports = giftsRouter;