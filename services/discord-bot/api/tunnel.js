const { Router } = require('express');
const { sendChannelEmbed } = require('../lib/channelSend');
const { buildTunnelEmbed } = require('../lib/embeds');

/**
 * @param {import('../model/Bot.js')} bot
 */
module.exports = (bot) => {
    const tunnelRouter = Router();
    const CHANNEL_ID = process.env.TUNNEL_CHANNEL_ID;

    /**
     * @swagger
     * /tunnel:
     *   post:
     *     summary: Report a change in the backend's Cloudflare tunnel URL
     *     description: Posts an embed to the tunnel Discord channel announcing the current tunnel URL - e.g. after the quick tunnel reconnects with a new hostname.
     *     tags:
     *       - Tunnel
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - url
     *             properties:
     *               url:
     *                 type: string
     *               label:
     *                 type: string
     *                 description: Optional prefix distinguishing which tunnel this is (e.g. "Dashboard") when more than one is in play
     *               note:
     *                 type: string
     *                 description: Optional bolded call-to-action line (e.g. reminding you to update a registered OAuth redirect URL)
     *     responses:
     *       200:
     *         description: Embed sent successfully
     *       400:
     *         description: Missing or invalid fields
     *       500:
     *         description: TUNNEL_CHANNEL_ID is not configured
     *       502:
     *         description: Failed to deliver the Discord embed
     */
    tunnelRouter.post('/', async (req, res) => {
        const { url, label, note } = req.body;

        if (!CHANNEL_ID)
            return res.status(500).json({ error: 'TUNNEL_CHANNEL_ID is not configured' });

        if (!url || typeof url !== 'string')
            return res.status(400).json({ error: 'url (string) is required' });

        try {
            const embed = await buildTunnelEmbed({ url, label, note });
            await sendChannelEmbed(bot.client, CHANNEL_ID, embed);
            res.json({ success: true });
        } catch (err) {
            console.error('Error sending tunnel embed:', err);
            res.status(502).json({ error: 'Failed to deliver Discord embed' });
        }
    });

    return tunnelRouter;
};