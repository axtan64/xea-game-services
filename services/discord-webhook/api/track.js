const { Router } = require('express');
const { sendWebhookEmbed } = require('../lib/discord');
const { buildTrackEmbed } = require('../lib/embeds');
const { ROLE_CONFIG } = require('../lib/roles');
const { DEVELOPER } = require('../resources/discord-roles');

const trackRouter = Router();

/**
 * @swagger
 * /track:
 *   post:
 *     summary: Log a notable player joining
 *     description: Posts an embed to Discord when a verified user, Roblox admin, or video star joins the game.
 *     tags:
 *       - Track
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - username
 *               - roles
 *             properties:
 *               userId:
 *                 type: string
 *               username:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [verified, admin, videostar]
 *     responses:
 *       200:
 *         description: Embed sent successfully
 *       400:
 *         description: Missing or invalid fields
 *       502:
 *         description: Failed to deliver the Discord webhook
 */
trackRouter.post('/', async (req, res) => {
    const { userId, username, roles } = req.body;
    const webhookUrl = req.headers['x-discord-webhook-url'];

    if (!webhookUrl)
        return res.status(400).json({ error: 'This game has no Discord webhook configured - set discordWebhookUrl on its Game row' });

    if (!userId || !username || !Array.isArray(roles) || roles.length === 0)
        return res.status(400).json({ error: 'userId, username, and a non-empty roles array are required' });

    const validRoles = roles.filter((role) => ROLE_CONFIG[role]);

    if (validRoles.length === 0)
        return res.status(400).json({ error: `roles must include at least one of: ${Object.keys(ROLE_CONFIG).join(', ')}` });

    try {
        const embed = await buildTrackEmbed({ userId, username, roles: validRoles });
        await sendWebhookEmbed(webhookUrl, embed, DEVELOPER);
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending track webhook:', err);
        res.status(502).json({ error: 'Failed to deliver Discord webhook' });
    }
});

module.exports = trackRouter;
