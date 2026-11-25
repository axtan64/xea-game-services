const { Router } = require('express');
const { publishGlobalEvent, MAX_MESSAGE_BYTES } = require('../lib/messaging');

const globalEventRouter = Router();

const KIND_PATTERN = /^[A-Za-z]{1,32}$/;
const isRobloxId = (value) => /^\d{1,19}$/.test(String(value ?? ''));

/**
 * @swagger
 * /global-event:
 *   post:
 *     summary: Tell every live server about an admin's global event
 *     description: >
 *       Publishes to Roblox's MessagingService (via the Open Cloud API) on the "GLOBAL_EVENT" topic. With an id, it
 *       starts the event the users service recorded (POST /users/global-events): a cash boost for every city until
 *       endsAt, or with no endsAt a gift every server hands to the players in it. With ended, it ends every running
 *       event of that kind (after POST /users/global-events/end).
 *     tags: [GlobalEvent]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kind]
 *             properties:
 *               id: { type: string, description: The recorded event's id; required unless ended }
 *               kind: { type: string, description: What it is, as the game names it (Cash, Dynamite) }
 *               amount: { type: integer, description: What it gives; required unless ended }
 *               endsAt: { type: integer, description: When a lasting event ends, in Unix seconds }
 *               createdBy: { type: string, description: Roblox user ID of the admin; required unless ended }
 *               ended: { type: boolean, description: End every running event of this kind instead }
 *     responses:
 *       204: { description: Published successfully }
 *       400: { description: Invalid body, too long, or missing MessagingService config }
 *       502: { description: Roblox's messaging service could not be reached }
 */
globalEventRouter.post('/', async (req, res) => {
    const { id, kind, amount, endsAt, createdBy, ended } = req.body ?? {};
    const universeId = req.headers['x-roblox-universe-id'];
    const apiKey = req.headers['x-roblox-open-cloud-api-key'];

    if (!universeId || !apiKey)
        return res.status(400).json({ error: 'This game has no MessagingService configuration - set robloxUniverseId/robloxOpenCloudApiKey on its Game row' });

    if (typeof kind !== 'string' || !KIND_PATTERN.test(kind))
        return res.status(400).json({ error: 'kind must be one word of letters, at most 32' });

    let message;
    if (ended === true) {
        message = { kind, ended: true };
    } else {
        if (typeof id !== 'string' || id.length === 0 || id.length > 64)
            return res.status(400).json({ error: 'id must be the recorded event\'s id' });

        if (!Number.isInteger(amount) || amount < 1)
            return res.status(400).json({ error: 'amount must be a positive integer' });

        if (endsAt != null && !Number.isInteger(endsAt))
            return res.status(400).json({ error: 'endsAt must be Unix seconds, or left out' });

        if (!isRobloxId(createdBy))
            return res.status(400).json({ error: 'createdBy must be a Roblox user ID' });

        message = { id, kind, amount, createdBy: String(createdBy), ...(endsAt != null && { endsAt }) };
    }

    try {
        await publishGlobalEvent(universeId, apiKey, message);
        res.status(204).send();
    } catch (err) {
        if (err instanceof RangeError)
            return res.status(400).json({ error: `Event too long (max ${MAX_MESSAGE_BYTES} bytes once encoded)` });

        console.error('Error publishing global event:', err);

        res.status(502).json({ error: 'Failed to reach Roblox messaging service', detail: err.message });
    }
});

module.exports = globalEventRouter;