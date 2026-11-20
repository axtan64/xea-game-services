const { Router } = require('express');
const { publishAccountChanged, MAX_MESSAGE_BYTES } = require('../lib/messaging');

const accountChangedRouter = Router();

/**
 * @swagger
 * /account-changed:
 *   post:
 *     summary: Tell every live server that a player's account changed
 *     description: >
 *       Publishes to Roblox's MessagingService (via the Open Cloud API) on the "ACCOUNT_CHANGED" topic. A server
 *       the player is in re-reads their account: it updates their roles, and kicks them if they are now banned, or
 *       with kickReason if one is given. For the dashboard's bans, admin roles and kicks, which change the database
 *       directly and would otherwise wait for the player to rejoin.
 *     tags: [AccountChanged]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string, description: Roblox user ID }
 *               kickReason: { type: string, description: Kick them from the server they're in, showing this }
 *     responses:
 *       204: { description: Published successfully }
 *       400: { description: Invalid body, too long, or missing MessagingService config }
 *       502: { description: Roblox's messaging service could not be reached }
 */
accountChangedRouter.post('/', async (req, res) => {
    const { userId, kickReason } = req.body ?? {};
    const universeId = req.headers['x-roblox-universe-id'];
    const apiKey = req.headers['x-roblox-open-cloud-api-key'];

    if (!universeId || !apiKey)
        return res.status(400).json({ error: 'This game has no MessagingService configuration - set robloxUniverseId/robloxOpenCloudApiKey on its Game row' });

    if (!/^\d{1,19}$/.test(String(userId ?? '')))
        return res.status(400).json({ error: 'userId must be a Roblox user ID' });

    if (kickReason !== undefined && typeof kickReason !== 'string')
        return res.status(400).json({ error: 'kickReason must be a string' });

    try {
        await publishAccountChanged(universeId, apiKey, String(userId), kickReason || undefined);
        res.status(204).send();
    } catch (err) {
        if (err instanceof RangeError)
            return res.status(400).json({ error: `kickReason too long (max ${MAX_MESSAGE_BYTES} bytes once encoded)` });

        console.error('Error publishing account change:', err);
        res.status(502).json({ error: 'Failed to reach Roblox messaging service', detail: err.message });
    }
});

module.exports = accountChangedRouter;