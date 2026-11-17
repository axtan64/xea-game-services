const { Router } = require('express');
const { CutcSaveSlot, CutcSlotAccess, CutcParty } = require('database');

const slotsRouter = Router();

// A player has this many slots, numbered from 1
const MAX_SLOT = 3;
// A lock not refreshed for this long is stale and may be taken over. The game autosaves (which refreshes it)
// every minute, so this is two missed saves and a bit
const LOCK_STALE_MS = 150 * 1000;
const MAX_LOCK_ID_LENGTH = 64;
const MAX_ACCESS_CODE_LENGTH = 256;
const MAX_CODE_LENGTH = 64;
// The most players a city holds, and the most friends a listing may name
const MAX_PLAYERS = 8;
const MAX_FRIENDS = 1000;
// A party that set off this recently may not have reached its server yet, so the city counts as opening
const LAUNCH_WINDOW_MS = 90 * 1000;

const isRobloxId = (value) => Number.isSafeInteger(value) && value > 0;
const isShortString = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max;

// Filter out other games - save slots are Clean Up The City's
slotsRouter.use((req, res, next) => {
    if (req.gameSlug !== 'cutc')
        return res.status(404).json({ error: 'Not found' });

    next();
});

// Validate the :ownerId/:slot pair once, for every route that names a slot
slotsRouter.param('ownerId', (req, res, next, ownerId) => {
    if (!/^\d{1,19}$/.test(ownerId))
        return res.status(400).json({ error: 'ownerId must be a Roblox user ID' });

    next();
});

slotsRouter.param('slot', (req, res, next, slot) => {
    const number = Number(slot);

    if (!Number.isInteger(number) || number < 1 || number > MAX_SLOT)
        return res.status(400).json({ error: `slot must be an integer between 1 and ${MAX_SLOT}` });

    req.slot = number;
    next();
});

// The lock ID a write must carry: the game server's own ID
function readLockId(req, res) {
    const lockId = req.body?.lockId;

    if (typeof lockId !== 'string' || lockId.length === 0 || lockId.length > MAX_LOCK_ID_LENGTH) {
        res.status(400).json({ error: `lockId must be a string of 1 to ${MAX_LOCK_ID_LENGTH} characters` });
        return null;
    }

    return lockId;
}

// Whether a slot's lock is live, as the lobby and a refused server see it
const isLocked = (slot) => slot.lockId != null && slot.lockedAt != null && Date.now() - slot.lockedAt.getTime() < LOCK_STALE_MS;

// The access code is for sending players into the city, never for showing
const describe = ({ accessCode, ...slot }) => ({ ...slot, isLocked: isLocked(slot) });

// Who is in a city, as its server says with a save or a heartbeat
const readPresence = (req) => (typeof req.body?.presence === 'object' && req.body.presence !== null ? req.body.presence : {});

/**
 * @swagger
 * components:
 *   schemas:
 *     SlotSummary:
 *       type: object
 *       properties:
 *         ownerId: { type: string }
 *         slot: { type: integer }
 *         version: { type: integer, description: Counts saves }
 *         cleanShare: { type: number, description: 0 to 1 }
 *         cash: { type: number }
 *         partySize: { type: integer }
 *         lastPlayedAt: { type: string, nullable: true }
 *         lockId: { type: string, nullable: true }
 *         lockedAt: { type: string, nullable: true }
 *         isLocked: { type: boolean, description: Whether a server holds a live lock }
 */

/**
 * @swagger
 * /slots/{ownerId}:
 *   get:
 *     summary: List a player's save slots, without the saves
 *     description: Only slots that have been used are listed.
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string }, description: Roblox user ID }
 *     responses:
 *       200:
 *         description: The player's slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slots: { type: array, items: { $ref: '#/components/schemas/SlotSummary' } }
 */
slotsRouter.get('/:ownerId', async (req, res) => {
    const slots = await CutcSaveSlot.list(req.params.ownerId);
    res.json({ slots: slots.map(describe) });
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}/lock:
 *   post:
 *     summary: Take a slot's session lock and read its save
 *     description: Creates the slot if the player has never used it (`data` is then null, and the server starts a new city). Asking again with the same lockId succeeds, so it is safe to retry. A lock not refreshed for 150 seconds is stale and is taken over.
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lockId]
 *             properties:
 *               lockId: { type: string, description: The game server's own ID }
 *     responses:
 *       200: { description: Locked. The slot, with its save in `data` }
 *       400: { description: Invalid lockId }
 *       409: { description: Another server holds a live lock. The body is the slot's summary }
 */
slotsRouter.post('/:ownerId/:slot/lock', async (req, res) => {
    const lockId = readLockId(req, res);
    if (!lockId) return;

    // A reserved server says which it is, so the code the lobby reserved it with can be kept with the lock:
    // that is what lets others be sent into the city while it is played
    const serverId = isShortString(req.body.serverId, MAX_LOCK_ID_LENGTH) ? req.body.serverId : null;
    const party = serverId ? await CutcParty.get(serverId) : null;
    const session = { serverId, accessCode: party?.accessCode ?? null };

    const { acquired, slot } = await CutcSaveSlot.lock(req.params.ownerId, req.slot, lockId, LOCK_STALE_MS, session);

    if (!acquired) {
        const { data, ...summary } = slot;
        return res.status(409).json({ error: 'Slot is locked by another server', ...describe(summary) });
    }

    const access = await CutcSlotAccess.get(req.params.ownerId, req.slot);
    res.json({ ...describe(slot), allowAway: access.allowAway });
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}:
 *   put:
 *     summary: Write a slot's save
 *     description: Only the server holding the lock may write. Also refreshes the lock. Idempotent - retrying a save that may have landed just writes it again.
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lockId, data]
 *             properties:
 *               lockId: { type: string }
 *               data: { type: object, description: The game's save, stored as given }
 *               summary:
 *                 type: object
 *                 properties:
 *                   cleanShare: { type: number }
 *                   cash: { type: number }
 *                   partySize: { type: integer }
 *     responses:
 *       200: { description: Saved. The slot's new summary }
 *       400: { description: Invalid body }
 *       409: { description: This server doesn't hold the lock (it went stale and another took it, or it was released) }
 */
slotsRouter.put('/:ownerId/:slot', async (req, res) => {
    const lockId = readLockId(req, res);
    if (!lockId) return;

    const { data, summary } = req.body;

    if (data === null || typeof data !== 'object' || Array.isArray(data))
        return res.status(400).json({ error: 'data must be an object' });

    const saved = await CutcSaveSlot.save(req.params.ownerId, req.slot, lockId, data, summary ?? {}, readPresence(req));

    if (!saved)
        return res.status(409).json({ error: 'This server does not hold the slot\'s lock' });

    // The owner may have changed who can play while they are away since this server last heard
    const access = await CutcSlotAccess.get(req.params.ownerId, req.slot);
    res.json({ ...describe(saved), allowAway: access.allowAway });
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}/heartbeat:
 *   post:
 *     summary: Keep a slot's lock alive without saving
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, required: [lockId], properties: { lockId: { type: string } } }
 *     responses:
 *       200: { description: Refreshed }
 *       409: { description: This server doesn't hold the lock }
 */
slotsRouter.post('/:ownerId/:slot/heartbeat', async (req, res) => {
    const lockId = readLockId(req, res);
    if (!lockId) return;

    if (!await CutcSaveSlot.heartbeat(req.params.ownerId, req.slot, lockId, readPresence(req)))
        return res.status(409).json({ error: 'This server does not hold the slot\'s lock' });

    const access = await CutcSlotAccess.get(req.params.ownerId, req.slot);
    res.json({ ok: true, allowAway: access.allowAway });
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}/lock:
 *   delete:
 *     summary: Release a slot's lock
 *     description: Safe to repeat - releasing a lock that is already gone (or was taken over) answers `released: false`, not an error.
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, required: [lockId], properties: { lockId: { type: string } } }
 *     responses:
 *       200: { description: Done }
 */
slotsRouter.delete('/:ownerId/:slot/lock', async (req, res) => {
    const lockId = readLockId(req, res);
    if (!lockId) return;

    res.json({ released: await CutcSaveSlot.unlock(req.params.ownerId, req.slot, lockId) });
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}:
 *   delete:
 *     summary: Delete a slot, so a new city can be started in it
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     responses:
 *       200: { description: Deleted, or there was nothing to delete }
 *       409: { description: A server is playing the slot }
 */
slotsRouter.delete('/:ownerId/:slot', async (req, res) => {
    if (await CutcSaveSlot.remove(req.params.ownerId, req.slot, LOCK_STALE_MS))
        return res.json({ deleted: true });

    // Nothing was deleted: either there was no slot, or it is being played
    const slot = await CutcSaveSlot.get(req.params.ownerId, req.slot);

    if (slot)
        return res.status(409).json({ error: 'Slot is being played' });

    res.json({ deleted: false });
});

// ---------------------------------------------------------------------------------------------------------------
// Sharing: who may join a slot, and getting them into it
// ---------------------------------------------------------------------------------------------------------------

/**
 * Whether a player may go into a city now, and if not why.
 * @param {object} access The slot's CutcSlotAccess (or its defaults)
 * @param {object|null} slot The slot's summary, if it has ever been locked
 * @param {boolean} isFriend Whether the game server found the player to be the owner's Roblox friend
 * @returns {{ allowed: boolean, live: boolean, reason?: string }} `live` says a server is playing it and can
 *     be joined. Reasons: Closed (shut to everyone), NotInvited, NotStarted (never played), OwnerAway, Full,
 *     InPlay (a server holds it that can't be joined)
 */
function judge(access, slot, userId, isFriend) {
    const held = slot != null && isLocked(slot);
    const live = held && slot.serverId != null && slot.accessCode != null;

    if (held && !live) return { allowed: false, live, reason: 'InPlay' };
    if (String(access.ownerId) === String(userId)) return { allowed: true, live };
    if (access.access === 'Nobody') return { allowed: false, live, reason: 'Closed' };

    const isInvited = CutcSlotAccess.isMember(access, userId);

    if (!isInvited && !(access.access === 'Friends' && isFriend)) return { allowed: false, live, reason: 'NotInvited' };
    if (!live && !(slot != null && slot.version > 0)) return { allowed: false, live, reason: 'NotStarted' };
    if (!access.allowAway && !(live && slot.ownerPresent)) return { allowed: false, live, reason: 'OwnerAway' };
    if (live && slot.playerCount >= MAX_PLAYERS) return { allowed: false, live, reason: 'Full' };

    return { allowed: true, live };
}

// A slot's sharing as its owner sees it
const describeAccess = (access) => ({
    slot: access.slot,
    access: access.access,
    allowAway: access.allowAway,
    inviteCode: CutcSlotAccess.formatCode(access.inviteCode),
    members: Array.isArray(access.members) ? access.members : [],
});

function readAccessBody(req, res) {
    const { access, allowAway } = req.body ?? {};

    if (!CutcSlotAccess.ACCESS.includes(access)) {
        res.status(400).json({ error: `access must be one of ${CutcSlotAccess.ACCESS.join(', ')}` });
        return null;
    }

    if (typeof allowAway !== 'boolean') {
        res.status(400).json({ error: 'allowAway must be a boolean' });
        return null;
    }

    return { access, allowAway };
}

/**
 * @swagger
 * /slots/joinable:
 *   post:
 *     summary: List the cities a player might join
 *     description: Slots the player is a member of, and their friends' that are open to friends, that have been played. Each says whether it can be entered now, and if not why (OwnerAway, Full, InPlay).
 *     tags: [Slots]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, friendIds]
 *             properties:
 *               userId: { type: number }
 *               friendIds: { type: array, items: { type: number }, description: The player's Roblox friends, read by the game server }
 *     responses:
 *       200: { description: The cities }
 *       400: { description: Invalid body }
 */
slotsRouter.post('/joinable', async (req, res) => {
    const { userId, friendIds } = req.body ?? {};

    if (!isRobloxId(userId))
        return res.status(400).json({ error: 'userId must be a Roblox user ID' });

    if (!Array.isArray(friendIds) || friendIds.length > MAX_FRIENDS || !friendIds.every(isRobloxId))
        return res.status(400).json({ error: `friendIds must be up to ${MAX_FRIENDS} Roblox user IDs` });

    const open = await CutcSlotAccess.findOpenTo(userId, friendIds);
    const summaries = await CutcSaveSlot.summaries(open.map(({ ownerId, slot }) => ({ ownerId, slot })));
    const friends = new Set(friendIds.map(String));
    const cities = [];

    for (const access of open) {
        const slot = summaries.find((summary) => summary.ownerId === access.ownerId && summary.slot === access.slot) ?? null;
        const verdict = judge(access, slot, userId, friends.has(String(access.ownerId)));

        // A city that was never played is nothing to list
        if (!slot || verdict.reason === 'NotStarted' || verdict.reason === 'NotInvited') continue;

        cities.push({
            ownerId: String(access.ownerId),
            slot: access.slot,
            relation: CutcSlotAccess.isMember(access, userId) ? 'Invited' : 'Friend',
            allowAway: access.allowAway,
            cleanShare: slot.cleanShare,
            lastPlayedAt: slot.lastPlayedAt,
            isLive: verdict.live,
            playerCount: verdict.live ? slot.playerCount : 0,
            ownerPresent: verdict.live && slot.ownerPresent,
            canEnter: verdict.allowed,
            reason: verdict.reason ?? null,
        });
    }

    res.json({ cities });
});

/**
 * @swagger
 * /slots/redeem:
 *   post:
 *     summary: Enter an invite code, making the player a member of its slot
 *     description: Idempotent - entering a code again changes nothing.
 *     tags: [Slots]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code]
 *             properties:
 *               userId: { type: number }
 *               code: { type: string }
 *     responses:
 *       200: { description: Now a member. The slot's owner and number }
 *       400: { description: Invalid body }
 *       404: { description: No slot has that code }
 *       409: { description: "The slot is the player's own, or has all the members it can hold (`reason`: Own or Full)" }
 */
slotsRouter.post('/redeem', async (req, res) => {
    const { userId, code } = req.body ?? {};

    if (!isRobloxId(userId))
        return res.status(400).json({ error: 'userId must be a Roblox user ID' });

    if (typeof code !== 'string' || code.length === 0 || code.length > MAX_CODE_LENGTH)
        return res.status(400).json({ error: `code must be a string of 1 to ${MAX_CODE_LENGTH} characters` });

    const { access, refusal } = await CutcSlotAccess.redeem(code, userId);

    if (refusal === 'Unknown')
        return res.status(404).json({ error: 'No city has that code', reason: refusal });

    if (refusal)
        return res.status(409).json({ error: 'That code can\'t be used', reason: refusal });

    res.json({ ownerId: String(access.ownerId), slot: access.slot });
});

/**
 * @swagger
 * /slots/{ownerId}/access:
 *   get:
 *     summary: Read who may join each of a player's slots
 *     description: All three slots are listed; one never set up has the defaults (the owner's friends, while the owner is playing).
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "`access`: one entry a slot, with its invite code and members" }
 */
slotsRouter.get('/:ownerId/access', async (req, res) => {
    const rows = await CutcSlotAccess.list(req.params.ownerId);
    const access = [];

    for (let slot = 1; slot <= MAX_SLOT; slot++)
        access.push(describeAccess(rows.find((row) => row.slot === slot) ?? { slot, ...CutcSlotAccess.DEFAULTS }));

    res.json({ access });
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}/access:
 *   put:
 *     summary: Set who may join a slot
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [access, allowAway]
 *             properties:
 *               access: { type: string, enum: [Nobody, Invited, Friends] }
 *               allowAway: { type: boolean, description: Whether they may play while the owner isn't in the city }
 *     responses:
 *       200: { description: The slot's sharing as it now is }
 *       400: { description: Invalid body }
 */
slotsRouter.put('/:ownerId/:slot/access', async (req, res) => {
    const body = readAccessBody(req, res);
    if (!body) return;

    res.json(describeAccess(await CutcSlotAccess.set(req.params.ownerId, req.slot, body)));
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}/invite:
 *   post:
 *     summary: Give a slot a new invite code
 *     description: The old code stops working; players who already entered it stay members.
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     responses:
 *       200: { description: The slot's sharing, with the new code }
 */
slotsRouter.post('/:ownerId/:slot/invite', async (req, res) => {
    res.json(describeAccess(await CutcSlotAccess.newInvite(req.params.ownerId, req.slot)));
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}/members:
 *   delete:
 *     summary: Take members off a slot
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: number, description: The member to remove; all of them if left out }
 *     responses:
 *       200: { description: The slot's sharing as it now is }
 *       400: { description: Invalid body }
 */
slotsRouter.delete('/:ownerId/:slot/members', async (req, res) => {
    const userId = req.body?.userId;

    if (userId != null && !isRobloxId(userId))
        return res.status(400).json({ error: 'userId must be a Roblox user ID' });

    res.json(describeAccess(await CutcSlotAccess.removeMembers(req.params.ownerId, req.slot, userId)));
});

/**
 * @swagger
 * /slots/{ownerId}/{slot}/enter:
 *   post:
 *     summary: Ask to go into a city, and learn which server to go to
 *     description: Checks the player may (the owner always may). If a server is playing the city, or a party set off for it in the last 90 seconds, answers that server. Otherwise answers `Closed`, and the lobby reserves a server and asks again with it as `candidate`, which is recorded as the party's and answered `Opened` (or, if someone got there first, theirs is answered instead).
 *     tags: [Slots]
 *     parameters:
 *       - { in: path, name: ownerId, required: true, schema: { type: string } }
 *       - { in: path, name: slot, required: true, schema: { type: integer, minimum: 1, maximum: 3 } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: number, description: Who is asking }
 *               isFriend: { type: boolean, description: Whether the game server found them to be the owner's friend }
 *               members: { type: array, items: { type: number }, description: Who travels with them }
 *               candidate:
 *                 type: object
 *                 properties:
 *                   serverId: { type: string }
 *                   accessCode: { type: string }
 *     responses:
 *       200: { description: "`state` Live or Opened with `serverId` and `accessCode`, or Closed" }
 *       400: { description: Invalid body }
 *       403: { description: "Not allowed in. `reason`: Closed, NotInvited, NotStarted, OwnerAway, Full or InPlay" }
 */
slotsRouter.post('/:ownerId/:slot/enter', async (req, res) => {
    const { userId, isFriend, members, candidate } = req.body ?? {};
    const ownerId = req.params.ownerId;

    if (!isRobloxId(userId))
        return res.status(400).json({ error: 'userId must be a Roblox user ID' });

    const travellers = members ?? [userId];

    if (!Array.isArray(travellers) || travellers.length === 0 || travellers.length > MAX_PLAYERS || !travellers.every(isRobloxId))
        return res.status(400).json({ error: `members must be 1 to ${MAX_PLAYERS} Roblox user IDs` });

    const isCandidate = candidate != null;

    if (isCandidate && !(isShortString(candidate.serverId, MAX_LOCK_ID_LENGTH) && isShortString(candidate.accessCode, MAX_ACCESS_CODE_LENGTH)))
        return res.status(400).json({ error: 'candidate must carry a serverId and an accessCode' });

    const [access, slot] = await Promise.all([
        CutcSlotAccess.get(ownerId, req.slot),
        CutcSaveSlot.summary(ownerId, req.slot),
    ]);
    const verdict = judge(access, slot, userId, isFriend === true);

    if (!verdict.allowed)
        return res.status(403).json({ error: 'Not allowed into this city', reason: verdict.reason });

    if (verdict.live)
        return res.json({ state: 'Live', serverId: slot.serverId, accessCode: slot.accessCode });

    // A party may be on its way there already: its server takes the lock a few seconds after it arrives
    const launching = await CutcParty.findLaunching(ownerId, req.slot, LAUNCH_WINDOW_MS);

    if (launching)
        return res.json({ state: 'Live', serverId: launching.serverId, accessCode: launching.accessCode });

    if (!isCandidate)
        return res.json({ state: 'Closed' });

    await CutcParty.put(candidate.serverId, { ownerId, slot: req.slot, members: travellers, accessCode: candidate.accessCode });
    res.json({ state: 'Opened', serverId: candidate.serverId, accessCode: candidate.accessCode });
});

module.exports = slotsRouter;