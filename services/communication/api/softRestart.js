const { Router } = require('express');
const { publishSoftRestart } = require('../lib/messaging');

const softRestartRouter = Router();

/**
 * @swagger
 * /soft-restart:
 *   post:
 *     summary: Soft restart every live server of a game
 *     description: >
 *       Publishes to Roblox's MessagingService (via the Open Cloud API) on the "SOFT_RESTART" topic. Every live
 *       server saves and moves its players on to a fresh server, which runs the latest published version: Clean Up
 *       The City sends a city's players to a new server of the same city, and the lobby's to a new lobby, putting
 *       each back where they stood. For the dashboard's restart button.
 *     tags: [SoftRestart]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestedBy: { type: string, description: Roblox user ID of whoever asked, for the servers' logs }
 *     responses:
 *       204: { description: Published successfully }
 *       400: { description: Invalid body, or missing MessagingService config }
 *       502: { description: Roblox's messaging service could not be reached }
 */
softRestartRouter.post('/', async (req, res) => {
    const { requestedBy } = req.body ?? {};
    const universeId = req.headers['x-roblox-universe-id'];
    const apiKey = req.headers['x-roblox-open-cloud-api-key'];

    if (!universeId || !apiKey)
        return res.status(400).json({ error: 'This game has no MessagingService configuration - set robloxUniverseId/robloxOpenCloudApiKey on its Game row' });

    if (requestedBy !== undefined && !/^\d{1,19}$/.test(String(requestedBy)))
        return res.status(400).json({ error: 'requestedBy must be a Roblox user ID' });

    try {
        await publishSoftRestart(universeId, apiKey, requestedBy === undefined ? undefined : String(requestedBy));
        res.status(204).send();
    } catch (err) {
        console.error('Error publishing a soft restart:', err);
        res.status(502).json({ error: 'Failed to reach Roblox messaging service', detail: err.message });
    }
});

module.exports = softRestartRouter;
