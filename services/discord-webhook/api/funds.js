const { Router } = require('express');
const { sendWebhookEmbed } = require('../lib/discord');
const { buildFundsEmbed } = require('../lib/embeds');

const fundsRouter = Router();
const WEBHOOK_URL = process.env.FUNDS_WEBHOOK_URL;

/**
 * @swagger
 * /funds:
 *   post:
 *     summary: Report a group's pending and total funds
 *     description: Posts an embed to Discord showing a Roblox group's pending and total Robux balance.
 *     tags:
 *       - Funds
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupName
 *               - pending
 *               - total
 *             properties:
 *               groupName:
 *                 type: string
 *               pending:
 *                 type: number
 *               total:
 *                 type: number
 *     responses:
 *       200:
 *         description: Embed sent successfully
 *       400:
 *         description: Missing or invalid fields
 *       502:
 *         description: Failed to deliver the Discord webhook
 */
fundsRouter.post('/', async (req, res) => {
    const { groupName, pending, total } = req.body;

    if (!WEBHOOK_URL)
        return res.status(500).json({ error: 'FUNDS_WEBHOOK_URL is not configured' });

    if (!groupName || typeof pending !== 'number' || typeof total !== 'number')
        return res.status(400).json({ error: 'groupName, pending (number), and total (number) are required' });

    try {
        const gameSlug = req.headers['x-game-slug']
        const embed = await buildFundsEmbed({ groupName, pending, total, gameSlug });
        await sendWebhookEmbed(WEBHOOK_URL, embed);
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending funds webhook:', err);
        res.status(502).json({ error: 'Failed to deliver Discord webhook' });
    }
});

module.exports = fundsRouter;