const { Router } = require('express');
const { publishProductGrant } = require('../lib/messaging');

const productGrantRouter = Router();

/**
 * @swagger
 * /product-grant:
 *   post:
 *     summary: Notify every live server that a recipient's OwnedProducts changed
 *     description: >
 *       Publishes to Roblox's MessagingService (via the Open Cloud API) on the "PRODUCT_GRANTED"
 *       topic. Every server subscribed to that topic checks whether the recipient is connected to
 *       it, and if so, resyncs their OwnedProducts session stat live.
 *     tags: [ProductGrant]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientUserId, productKey]
 *             properties:
 *               recipientUserId: { type: string }
 *               productKey: { type: string }
 *     responses:
 *       204: { description: Published successfully }
 *       400: { description: Invalid body or missing MessagingService config }
 *       502: { description: Roblox's messaging service could not be reached }
 */
productGrantRouter.post('/', async (req, res) => {
    const { recipientUserId, productKey } = req.body ?? {};
    const universeId = req.headers['x-roblox-universe-id'];
    const apiKey = req.headers['x-roblox-open-cloud-api-key'];

    if (!universeId || !apiKey)
        return res.status(400).json({ error: 'This game has no MessagingService configuration - set robloxUniverseId/robloxOpenCloudApiKey on its Game row' });

    if (!recipientUserId || !productKey)
        return res.status(400).json({ error: 'recipientUserId and productKey are required' });

    try {
        await publishProductGrant(universeId, apiKey, recipientUserId, productKey);
        res.status(204).send();
    } catch (err) {
        console.error('Error publishing product grant:', err);
        res.status(502).json({ error: 'Failed to reach Roblox messaging service' });
    }
});

module.exports = productGrantRouter;