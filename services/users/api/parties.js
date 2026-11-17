const { Router } = require('express');
const { CutcParty } = require('database');

const partiesRouter = Router();

const MAX_SLOT = 3;
const MAX_MEMBERS = 8;
const MAX_SERVER_ID_LENGTH = 64;

const isRobloxId = (value) => Number.isSafeInteger(value) && value > 0;

// Filter out other games: parties are Clean Up The City's
partiesRouter.use((req, res, next) => {
    if (req.gameSlug !== 'cutc')
        return res.status(404).json({ error: 'Not found' });

    next();
});

partiesRouter.param('serverId', (req, res, next, serverId) => {
    if (serverId.length === 0 || serverId.length > MAX_SERVER_ID_LENGTH)
        return res.status(400).json({ error: `serverId must be 1 to ${MAX_SERVER_ID_LENGTH} characters` });

    next();
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Party:
 *       type: object
 *       properties:
 *         serverId: { type: string, description: The reserved server's ID }
 *         ownerId: { type: string, description: Whose save slot is played }
 *         slot: { type: integer }
 *         members: { type: array, items: { type: number }, description: Roblox user IDs allowed in, the owner included }
 *         createdAt: { type: string }
 */

/**
 * @swagger
 * /parties/{serverId}:
 *   put:
 *     summary: Record the party heading to a reserved server
 *     description: Written by the lobby just before it teleports the party. Idempotent - writing it again replaces it.
 *     tags: [Parties]
 *     parameters:
 *       - { in: path, name: serverId, required: true, schema: { type: string }, description: The reserved server's ID }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ownerId, slot, members]
 *             properties:
 *               ownerId: { type: number }
 *               slot: { type: integer, minimum: 1, maximum: 3 }
 *               members: { type: array, items: { type: number }, maxItems: 8 }
 *     responses:
 *       200:
 *         description: Recorded
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Party' }
 *       400: { description: Invalid body }
 */
partiesRouter.put('/:serverId', async (req, res) => {
    const { ownerId, slot, members } = req.body ?? {};

    if (!isRobloxId(ownerId))
        return res.status(400).json({ error: 'ownerId must be a Roblox user ID' });

    if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SLOT)
        return res.status(400).json({ error: `slot must be an integer between 1 and ${MAX_SLOT}` });

    if (!Array.isArray(members) || members.length === 0 || members.length > MAX_MEMBERS || !members.every(isRobloxId))
        return res.status(400).json({ error: `members must be 1 to ${MAX_MEMBERS} Roblox user IDs` });

    res.json(await CutcParty.put(req.params.serverId, { ownerId, slot, members }));
});

/**
 * @swagger
 * /parties/{serverId}:
 *   get:
 *     summary: Read the party a reserved server was started for
 *     tags: [Parties]
 *     parameters:
 *       - { in: path, name: serverId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: The party
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Party' }
 *       404: { description: No party was recorded for this server }
 */
partiesRouter.get('/:serverId', async (req, res) => {
    const party = await CutcParty.get(req.params.serverId);

    if (!party)
        return res.status(404).json({ error: 'No party recorded for this server' });

    res.json(party);
});

/**
 * @swagger
 * /parties/{serverId}:
 *   delete:
 *     summary: Forget a party, once its server has closed
 *     tags: [Parties]
 *     parameters:
 *       - { in: path, name: serverId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Done, whether or not there was one }
 */
partiesRouter.delete('/:serverId', async (req, res) => {
    res.json({ deleted: await CutcParty.remove(req.params.serverId) });
});

module.exports = partiesRouter;