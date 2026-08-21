const { Router } = require('express');
const { publishAnnouncement, MAX_MESSAGE_BYTES } = require('../lib/messaging');

const announceRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AnnounceRequest:
 *       type: object
 *       required: [userId, message]
 *       properties:
 *         userId:
 *           type: string
 *           description: Roblox user ID of the sender
 *         message:
 *           type: string
 *           description: Announcement text
 */

/**
 * @swagger
 * /announce:
 *   post:
 *     summary: Broadcast a global announcement to every live server
 *     description: >
 *       Publishes to Roblox's MessagingService (via the Open Cloud API) on the "announcements" topic.
 *       Every server subscribed to that topic - including the one the sender is on, if any - receives
 *       and displays it. There's no dependency on a live game server to trigger this.
 *     tags: [Announce]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AnnounceRequest' }
 *     responses:
 *       204:
 *         description: Announcement published successfully
 *       400:
 *         description: Invalid body, or message too long for a single MessagingService payload
 *       502:
 *         description: Roblox's messaging service could not be reached
 */
announceRouter.post('/', async (req, res) => {
    const { userId, message } = req.body ?? {};

    if (typeof userId !== 'string' && typeof userId !== 'number')
        return res.status(400).json({ error: 'userId is required' });

    if (typeof message !== 'string' || message.trim().length === 0)
        return res.status(400).json({ error: 'message is required' });

    try {
        await publishAnnouncement(userId, message);
        res.status(204).send();
    } catch (err) {
        if (err instanceof RangeError)
            return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_BYTES} bytes once encoded with userId)` });

        console.error('Error publishing announcement:', err);

        res.status(502).json({ error: 'Failed to reach Roblox messaging service' });
    }
});

module.exports = announceRouter;