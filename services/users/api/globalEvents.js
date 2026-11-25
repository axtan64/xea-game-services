const { Router } = require('express');
const { CutcGlobalEvent } = require('database');

const globalEventsRouter = Router();

// What the game names its events: a word, which the game reads as it likes ("Cash", "Dynamite")
const KIND_PATTERN = /^[A-Za-z]{1,32}$/;
const MAX_AMOUNT = 1000;
// A lasting event runs a week at most
const MAX_SECONDS = 7 * 24 * 60 * 60;

const isRobloxId = (value) => /^\d{1,19}$/.test(String(value ?? '')) && BigInt(value) > 0n;

// Filter out other games: global events are Clean Up The City's
globalEventsRouter.use((req, res, next) => {
    if (req.gameSlug !== 'cutc')
        return res.status(404).json({ error: 'Not found' });

    next();
});

/**
 * @swagger
 * components:
 *   schemas:
 *     GlobalEvent:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         kind: { type: string, description: What it is, as the game names it (Cash, Dynamite) }
 *         amount: { type: integer, description: What it gives (the cash boost's factor, the sticks each) }
 *         endsAt: { type: string, nullable: true, description: When a lasting event ends; null for one given at once }
 *         createdBy: { type: string, description: Roblox user ID of the admin who sent it }
 *         createdAt: { type: string }
 */

/**
 * @swagger
 * /global-events:
 *   get:
 *     summary: List the global events still running
 *     description: >
 *       The lasting events (a cash boost for every city) whose endsAt is still to come, oldest first. A game server
 *       reads them as it starts, since it missed the GLOBAL_EVENT messages sent before it was up.
 *     tags: [GlobalEvents]
 *     responses:
 *       200:
 *         description: The running events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events: { type: array, items: { $ref: '#/components/schemas/GlobalEvent' } }
 */
globalEventsRouter.get('/', async (req, res) => {
    const events = await CutcGlobalEvent.listRunning();
    res.json({ events });
});

/**
 * @swagger
 * /global-events:
 *   post:
 *     summary: Record a global event an admin sent
 *     description: >
 *       Stores it, so servers that start while it runs still see it. Telling the live servers is the caller's next
 *       step, through the communication service's /global-event, with the event this answers.
 *     tags: [GlobalEvents]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kind, amount, createdBy]
 *             properties:
 *               kind: { type: string }
 *               amount: { type: integer, minimum: 1, maximum: 1000 }
 *               seconds: { type: integer, minimum: 1, maximum: 604800, description: How long it runs; none for one given at once }
 *               createdBy: { type: string, description: Roblox user ID of the admin }
 *     responses:
 *       201:
 *         description: Recorded
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/GlobalEvent' }
 *       400: { description: Invalid body }
 */
globalEventsRouter.post('/', async (req, res) => {
    const { kind, amount, seconds, createdBy } = req.body ?? {};

    if (typeof kind !== 'string' || !KIND_PATTERN.test(kind))
        return res.status(400).json({ error: 'kind must be one word of letters, at most 32' });

    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT)
        return res.status(400).json({ error: `amount must be an integer from 1 to ${MAX_AMOUNT}` });

    if (seconds != null && (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_SECONDS))
        return res.status(400).json({ error: `seconds must be an integer from 1 to ${MAX_SECONDS}, or left out` });

    if (!isRobloxId(createdBy))
        return res.status(400).json({ error: 'createdBy must be a Roblox user ID' });

    const event = await CutcGlobalEvent.create({ kind, amount, seconds: seconds ?? null, createdBy });
    res.status(201).json(event);
});

/**
 * @swagger
 * /global-events/end:
 *   post:
 *     summary: End every running global event of a kind now
 *     description: >
 *       Sets their endsAt to now, so servers that start later no longer see them. Telling the live servers is the
 *       caller's next step, through the communication service's /global-event with ended set.
 *     tags: [GlobalEvents]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kind]
 *             properties:
 *               kind: { type: string }
 *     responses:
 *       200:
 *         description: How many were running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ended: { type: integer }
 *       400: { description: Invalid body }
 */
globalEventsRouter.post('/end', async (req, res) => {
    const { kind } = req.body ?? {};

    if (typeof kind !== 'string' || !KIND_PATTERN.test(kind))
        return res.status(400).json({ error: 'kind must be one word of letters, at most 32' });

    const ended = await CutcGlobalEvent.endRunning(kind);
    res.json({ ended });
});

module.exports = globalEventsRouter;