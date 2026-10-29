const { Router } = require('express');
const { sendChannelEmbed } = require('../lib/channelSend');
const { buildTrackEmbed } = require('../lib/embeds');
const { ROLE_CONFIG } = require('../lib/roles');
const { DEVELOPER } = require('../resources/discord-roles');

/**
 * @param {import('../model/Bot.js')} bot
 */
module.exports = (bot) => {
    const trackRouter = Router();
    const CHANNEL_ID = process.env.TRACK_CHANNEL_ID;

    /**
     * @swagger
     * /track:
     *   post:
     *     summary: Log a notable player joining
     *     description: Posts an embed to the tracking Discord channel when a verified user, Roblox admin, or video star joins the game.
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
     *       500:
     *         description: TRACK_CHANNEL_ID is not configured
     *       502:
     *         description: Failed to deliver the Discord embed
     */
    trackRouter.post('/', async (req, res) => {
        const { userId, username, roles } = req.body;

        if (!CHANNEL_ID)
            return res.status(500).json({ error: 'TRACK_CHANNEL_ID is not configured' });

        if (!userId || !username || !Array.isArray(roles) || roles.length === 0)
            return res.status(400).json({ error: 'userId, username, and a non-empty roles array are required' });

        const validRoles = roles.filter((role) => ROLE_CONFIG[role]);

        if (validRoles.length === 0)
            return res.status(400).json({ error: `roles must include at least one of: ${Object.keys(ROLE_CONFIG).join(', ')}` });

        try {
            const gameSlug = req.headers['x-game-slug'];
            const embed = await buildTrackEmbed({ userId, username, roles: validRoles, gameSlug });
            await sendChannelEmbed(bot.client, CHANNEL_ID, embed, DEVELOPER);
            res.json({ success: true });
        } catch (err) {
            console.error('Error sending track embed:', err);
            res.status(502).json({ error: 'Failed to deliver Discord embed' });
        }
    });

    return trackRouter;
};