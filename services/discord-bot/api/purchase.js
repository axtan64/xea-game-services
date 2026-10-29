const { Router } = require('express');
const { sendChannelEmbed } = require('../lib/channelSend');
const { buildPurchaseEmbed } = require('../lib/embeds');

/**
 * @param {import('../model/Bot.js')} bot
 */
module.exports = (bot) => {
    const purchaseRouter = Router();
    const CHANNEL_ID = process.env.PURCHASE_CHANNEL_ID;

    /**
     * @swagger
     * /purchase:
     *   post:
     *     summary: Log a gamepass or devproduct purchase
     *     description: Posts an embed to the purchases Discord channel when a user purchases a gamepass or devproduct.
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
     *       500:
     *         description: PURCHASE_CHANNEL_ID is not configured
     *       502:
     *         description: Failed to deliver the Discord embed
     */
    purchaseRouter.post('/', async (req, res) => {
        const { userId, username, productName, robux, type } = req.body;

        if (!CHANNEL_ID)
            return res.status(500).json({ error: 'PURCHASE_CHANNEL_ID is not configured' });

        if (!userId || !username || !productName || typeof robux !== 'number' || !['gamepass', 'devproduct'].includes(type))
            return res.status(400).json({ error: 'userId, username, productName, robux (number), and type (gamepass|devproduct) are required' });

        try {
            const gameSlug = req.headers['x-game-slug'];
            const embed = await buildPurchaseEmbed({ userId, username, productName, robux, type, gameSlug });
            await sendChannelEmbed(bot.client, CHANNEL_ID, embed);
            res.json({ success: true });
        } catch (err) {
            console.error('Error sending purchase embed:', err);
            res.status(502).json({ error: 'Failed to deliver Discord embed' });
        }
    });

    return purchaseRouter;
};