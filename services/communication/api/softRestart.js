const { Router } = require('express');
const { publishSoftRestart } = require('../lib/messaging');

const softRestartRouter = Router();

// A game server's JobId (game.JobId), the GUID Roblox gives every server
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The most servers one request names (five messages of 20)
const MAX_JOB_IDS = 100;

/**
 * @swagger
 * /soft-restart:
 *   post:
 *     summary: Soft restart live servers of a game, every one or those named
 *     description: >
 *       Publishes to Roblox's MessagingService (via the Open Cloud API) on the "SOFT_RESTART" topic. A server it
 *       is for saves and moves its players on to a fresh server, which runs the latest published version: Clean Up
 *       The City sends a city's players to a new server of the same city, and the lobby's to a new lobby, putting
 *       each back where they stood. With neither jobIds nor lobbies it is for every server; otherwise only for the
 *       servers named, sent 20 to a message to fit Roblox's 1 KB. For the dashboard's restart buttons.
 *     tags: [SoftRestart]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestedBy: { type: string, description: Roblox user ID of whoever asked, for the servers' logs }
 *               jobIds:
 *                 type: array
 *                 description: The JobIds (game.JobId) of the servers to restart, 1 to 100; leave out for every server
 *                 items: { type: string }
 *               lobbies: { type: boolean, description: Also every lobby server (Clean Up The City's public servers) }
 *     responses:
 *       204: { description: Published successfully }
 *       400: { description: Invalid body, or missing MessagingService config }
 *       502: { description: Roblox's messaging service could not be reached; the error says how many messages went first }
 */
softRestartRouter.post('/', async (req, res) => {
    const { requestedBy, jobIds, lobbies } = req.body ?? {};
    const universeId = req.headers['x-roblox-universe-id'];
    const apiKey = req.headers['x-roblox-open-cloud-api-key'];

    if (!universeId || !apiKey)
        return res.status(400).json({ error: 'This game has no MessagingService configuration - set robloxUniverseId/robloxOpenCloudApiKey on its Game row' });

    if (requestedBy !== undefined && !/^\d{1,19}$/.test(String(requestedBy)))
        return res.status(400).json({ error: 'requestedBy must be a Roblox user ID' });

    // An empty list is refused rather than read as every server, so a caller that picked nothing restarts nothing
    if (jobIds !== undefined && (!Array.isArray(jobIds) || jobIds.length === 0 || jobIds.length > MAX_JOB_IDS
        || !jobIds.every((id) => typeof id === 'string' && JOB_ID.test(id))))
        return res.status(400).json({ error: `jobIds must be a list of 1 to ${MAX_JOB_IDS} server JobIds; leave it out to restart every server` });

    if (lobbies !== undefined && typeof lobbies !== 'boolean')
        return res.status(400).json({ error: 'lobbies must be true or false' });

    if (lobbies === false && jobIds === undefined)
        return res.status(400).json({ error: 'That names no server: give jobIds, lobbies: true, or neither for every server' });

    const order = {
        requestedBy: requestedBy === undefined ? undefined : String(requestedBy),
        jobIds: jobIds && [...new Set(jobIds.map((id) => id.toLowerCase()))],
        lobbies: lobbies === true,
    };

    try {
        await publishSoftRestart(universeId, apiKey, order);
        res.status(204).send();
    } catch (err) {
        console.error('Error publishing a soft restart:', err);
        res.status(502).json({ error: 'Failed to reach Roblox messaging service', detail: err.message });
    }
});

module.exports = softRestartRouter;
