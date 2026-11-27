const { Router } = require('express');
const { sendChannelMessage } = require('../lib/channelSend');

// 5101 -> "5,101", by hand so it doesn't hang on which locales the image's Node carries
const withCommas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const isCount = (n) => Number.isInteger(n) && n >= 0;

/**
 * The milestones channel's message for a new player peak
 * @param {{ name: string, players: number, previous: number, url: string }} peak
 * @returns {string}
 */
function formatPlayerPeak({ name, players, previous, url }) {
    return `🎉 **New ${name} player peak!** ${withCommas(players)} players online! Previous peak was ${withCommas(previous)}.\n${url}`;
}

/**
 * @param {import('../model/Bot.js')} bot
 */
module.exports = (bot) => {
    const playerPeakRouter = Router();
    const CHANNEL_ID = process.env.MILESTONES_CHANNEL_ID;

    /**
     * @swagger
     * /player-peak:
     *   post:
     *     summary: Announce a game's new player peak
     *     description: Posts a message to the milestones Discord channel when a game has more players at once than ever before. The admin dashboard's player-count poller calls it.
     *     tags:
     *       - Milestones
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - players
     *               - previous
     *               - url
     *             properties:
     *               name:
     *                 type: string
     *                 description: The game's display name, e.g. Clean Up The City
     *               players:
     *                 type: integer
     *                 description: The new peak
     *               previous:
     *                 type: integer
     *                 description: The peak it beat
     *               url:
     *                 type: string
     *                 description: The game's page on roblox.com
     *     responses:
     *       200:
     *         description: Message sent successfully
     *       400:
     *         description: Missing or invalid fields
     *       500:
     *         description: MILESTONES_CHANNEL_ID is not configured
     *       502:
     *         description: Failed to deliver the Discord message
     */
    playerPeakRouter.post('/', async (req, res) => {
        const { name, players, previous, url } = req.body ?? {};

        if (!CHANNEL_ID)
            return res.status(500).json({ error: 'MILESTONES_CHANNEL_ID is not configured' });

        if (typeof name !== 'string' || !name.trim() || name.length > 100 || !isCount(players) || !isCount(previous)
            || typeof url !== 'string' || !url.startsWith('https://www.roblox.com/games/'))
            return res.status(400).json({ error: 'name, players and previous (whole numbers), and url (a roblox.com game page) are required' });

        try {
            await sendChannelMessage(bot.client, CHANNEL_ID, formatPlayerPeak({ name: name.trim(), players, previous, url }));
            res.json({ success: true });
        } catch (err) {
            console.error('Error sending player peak:', err);
            res.status(502).json({ error: 'Failed to deliver Discord message' });
        }
    });

    return playerPeakRouter;
};

module.exports.formatPlayerPeak = formatPlayerPeak;