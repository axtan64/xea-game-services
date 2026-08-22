const { Router } = require('express');
const { sendWebhookEmbed } = require('../lib/discord');
const { buildPurchaseEmbed } = require('../lib/embeds');

const purchaseRouter = Router();

/**
 * @swagger
 * /purchase:
 *   post:
 *     summary: Log a gamepass or devproduct purchase
 *     description: Posts an embed to Discord when a user purchases a gamepass or devproduct.
 *     tags:
 *       - Purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - username
 *               - productName
 *               - robux
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *               username:
 *                 type: string
 *               productName:
 *                 type: string
 *               robux:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [gamepass, devproduct]
 *     responses:
 *       200:
 *         description: Embed sent successfully
 *       400:
 *         description: Missing or invalid fields
 *       502:
 *         description: Failed to deliver the Discord webhook
 */
purchaseRouter.post('/', async (req, res) => {
    const { userId, username, productName, robux, type } = req.body;
    const webhookUrl = req.headers['x-discord-webhook-url'];

    if (!webhookUrl)
        return res.status(400).json({ error: 'This game has no Discord webhook configured - set discordWebhookUrl on its Game row' });

    if (!userId || !username || !productName || typeof robux !== 'number' || !['gamepass', 'devproduct'].includes(type))
        return res.status(400).json({ error: 'userId, username, productName, robux (number), and type (gamepass|devproduct) are required' });

    try {
        const embed = await buildPurchaseEmbed({ userId, username, productName, robux, type });
        await sendWebhookEmbed(webhookUrl, embed);
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending purchase webhook:', err);
        res.status(502).json({ error: 'Failed to deliver Discord webhook' });
    }
});

module.exports = purchaseRouter;
