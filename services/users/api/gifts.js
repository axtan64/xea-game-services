const { Router } = require('express');
const { Donation } = require('database');

const giftsRouter = Router();
const MAX_TOP_DONORS_PAGE_SIZE = 100;

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

    const gift = await Donation.create({ fromRobloxId, toRobloxId, amount, message });
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
    const gifts = await Donation.listPendingByRecipient(req.params.toRobloxId);
    res.json(gifts);
});

/**
 * @swagger
 * /gifts/{id}:
 *   delete:
 *     summary: Claim a gift
 *     description: Moves the gift's amount into the recipient's unclaimedRobux/robuxRaised, and stamps it claimed (it stays in the donation ledger - it isn't actually deleted). Call this when a player successfully claims a gift in-game.
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
 *       409:
 *         description: This gift has already been claimed
 */
giftsRouter.delete('/:id', async (req, res) => {
    try {
        const gift = await Donation.claim(req.params.id);
        res.json(gift);
    } catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'No gift found with this ID' });

        if (err.code === 'ALREADY_CLAIMED')
            return res.status(409).json({ error: 'This gift has already been claimed' });

        throw err;
    }
});

/**
 * @swagger
 * /gifts/{toRobloxId}/top-donors:
 *   post:
 *     summary: Get the players who have donated the most to a player, paged
 *     description: Aggregates the permanent donation ledger (pending and claimed alike) by sender, ranked by total amount donated to the given recipient. Roblox-server-only endpoint - page size is caller-controlled via the request body since there's no untrusted client involved.
 *     tags: [Gifts]
 *     parameters:
 *       - in: path
 *         name: toRobloxId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID of the recipient
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
 *         description: Top donors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page: { type: integer }
 *                 pageSize: { type: integer }
 *                 donors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fromRobloxId: { type: string }
 *                       totalAmount: { type: number }
 *       400:
 *         description: Invalid body
 */
giftsRouter.post('/:toRobloxId/top-donors', async (req, res) => {
    const { page = 1, pageSize } = req.body ?? {};

    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_TOP_DONORS_PAGE_SIZE)
        return res.status(400).json({ error: `pageSize must be an integer between 1 and ${MAX_TOP_DONORS_PAGE_SIZE}` });

    if (!Number.isInteger(page) || page < 1)
        return res.status(400).json({ error: 'page must be a positive integer' });

    const donors = await Donation.topDonorsTo(req.params.toRobloxId, { page, pageSize });
    res.json({ page, pageSize, donors });
});

module.exports = giftsRouter;