const { Router } = require('express');
const { sendWebhookEmbed } = require('../lib/discord');
const { buildTunnelEmbed } = require('../lib/embeds');

const tunnelRouter = Router();

/**
 * @swagger
 * /tunnel:
 *   post:
 *     summary: Report a change in the backend's Cloudflare tunnel URL
 *     description: Posts an embed to Discord announcing the current tunnel URL - e.g. after the quick tunnel reconnects with a new hostname.
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
 *     responses:
 *       200:
 *         description: Embed sent successfully
 *       400:
 *         description: Missing or invalid fields
 *       502:
 *         description: Failed to deliver the Discord webhook
 */
tunnelRouter.post('/', async (req, res) => {
    const { url } = req.body;
    const webhookUrl = req.headers['x-discord-webhook-url'];

    if (!webhookUrl)
        return res.status(400).json({ error: 'This game has no Discord webhook configured - set discordWebhookUrl on its Game row' });

    if (!url || typeof url !== 'string')
        return res.status(400).json({ error: 'url (string) is required' });

    try {
        const embed = await buildTunnelEmbed({ url });
        await sendWebhookEmbed(webhookUrl, embed);
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending tunnel webhook:', err);
        res.status(502).json({ error: 'Failed to deliver Discord webhook' });
    }
});

module.exports = tunnelRouter;
