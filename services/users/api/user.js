const { Router } = require('express');
const { PlayerStats, UnknownStatFieldError, User } = require('database');

const userRouter = Router();

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @swagger
 * components:
 *   schemas:
 *     PlayerStats:
 *       type: object
 *       properties:
 *         level:
 *           type: number
 *         gold:
 *           type: string
 *           description: Serialized BigNumber ("Layer;Exponent")
 */

/**
 * @swagger
 * /{userId}:
 *   get:
 *     summary: Get a player's stats
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PlayerStats' }
 *       404:
 *         description: No stats found for this user
 */
userRouter.get('/:userId', async (req, res) => {
    const stats = await PlayerStats.get(req.params.userId);

    if (!stats)
        return res.status(404).json({ error: 'No stats found for this user' });

    res.json(stats);
});

/**
 * @swagger
 * /{userId}:
 *   post:
 *     summary: Create a player's stats
 *     description: Fails if stats already exist for this user - use PUT to upsert instead.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlayerStats' }
 *     responses:
 *       201:
 *         description: Stats created successfully
 *       400:
 *         description: Invalid body
 *       409:
 *         description: Stats already exist for this user
 */
userRouter.post('/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!isPlainObject(req.body))
        return res.status(400).json({ error: 'Body must be an object' });

    const existing = await PlayerStats.get(userId);

    if (existing)
        return res.status(409).json({ error: 'Stats already exist for this user' });

    try {
        const stats = await PlayerStats.create(userId, req.body);
        res.status(201).json(stats);
    } catch (err) {
        if (err instanceof UnknownStatFieldError) {
            return res.status(400).json({ error: err.message });
        }
        throw err;
    }
});

/**
 * @swagger
 * /{userId}:
 *   put:
 *     summary: Upsert a player's stats
 *     description: Creates stats for this user if none exist, merging the given fields onto any existing row otherwise.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlayerStats' }
 *     responses:
 *       200:
 *         description: Stats updated successfully
 *       201:
 *         description: Stats created successfully
 *       400:
 *         description: Invalid body
 */
userRouter.put('/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!isPlainObject(req.body))
        return res.status(400).json({ error: 'Body must be an object' });

    const existed = Boolean(await PlayerStats.get(userId));

    try {
        const stats = await PlayerStats.upsert(userId, req.body);
        res.status(existed ? 200 : 201).json(stats);
    } catch (err) {
        if (err instanceof UnknownStatFieldError)
            return res.status(400).json({ error: err.message });

        throw err;
    }
});

/**
 * @swagger
 * /{userId}:
 *   patch:
 *     summary: Update a player's stats
 *     description: Fails if no stats exist yet for this user - use PUT to upsert instead.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlayerStats' }
 *     responses:
 *       200:
 *         description: Stats updated successfully
 *       400:
 *         description: Invalid body
 *       404:
 *         description: No stats found for this user
 */
userRouter.patch('/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!isPlainObject(req.body))
        return res.status(400).json({ error: 'Body must be an object' });

    const existing = await PlayerStats.get(userId);

    if (!existing)
        return res.status(404).json({ error: 'No stats found for this user' });

    try {
        const stats = await PlayerStats.update(userId, req.body);
        res.json(stats);
    } catch (err) {
        if (err instanceof UnknownStatFieldError)
            return res.status(400).json({ error: err.message });

        throw err;
    }
});

/**
 * @swagger
 * /{userId}:
 *   delete:
 *     summary: Delete a player's stats
 *     description: Resets this user's save data. Does not touch identity or purchase history.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     responses:
 *       204:
 *         description: Stats deleted successfully
 *       404:
 *         description: No stats found for this user
 */
userRouter.delete('/:userId', async (req, res) => {
    const existing = await PlayerStats.get(req.params.userId);

    if (!existing)
        return res.status(404).json({ error: 'No stats found for this user' });

    await PlayerStats.delete(req.params.userId);

    res.status(204).send();
});

/**
 * @swagger
 * components:
 *   schemas:
 *     BanRequest:
 *       type: object
 *       properties:
 *         reason:
 *           type: string
 *           description: Reason for the ban
 *         duration:
 *           type: number
 *           description: Ban length in seconds. Omit for a permanent ban.
 */

/**
 * @swagger
 * /{userId}/ban:
 *   post:
 *     summary: Ban a user
 *     description: Creates a User record for this Roblox ID if one doesn't exist yet. Omitting duration bans permanently.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BanRequest' }
 *     responses:
 *       200:
 *         description: User banned successfully
 *       400:
 *         description: Invalid body
 */
userRouter.post('/:userId/ban', async (req, res) => {
    const { userId } = req.params;
    const { reason, duration } = isPlainObject(req.body) ? req.body : {};

    if (reason !== undefined && typeof reason !== 'string')
        return res.status(400).json({ error: 'reason must be a string' });

    if (duration !== undefined && !(typeof duration === 'number' && duration > 0))
        return res.status(400).json({ error: 'duration must be a positive number of seconds' });

    const expiresAt = duration ? new Date(Date.now() + duration * 1000) : null;
    const user = await User.ban(userId, { reason, expiresAt });

    res.json(user);
});

/**
 * @swagger
 * /{userId}/ban:
 *   delete:
 *     summary: Unban a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     responses:
 *       200:
 *         description: User unbanned successfully
 *       404:
 *         description: No user found for this ID
 */
userRouter.delete('/:userId/ban', async (req, res) => {
    try {
        const user = await User.unban(req.params.userId);
        res.json(user);
    } catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'No user found for this ID' });

        throw err;
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         isAdmin:
 *           type: boolean
 *         bannedAt:
 *           type: string
 *           nullable: true
 *         banReason:
 *           type: string
 *           nullable: true
 *         banExpiresAt:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /{userId}/account:
 *   get:
 *     summary: Get a user's account (moderation/identity) info
 *     description: Always returns 200 with defaults (isAdmin false, no ban) if this Roblox ID has no User row yet.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     responses:
 *       200:
 *         description: Account info retrieved successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Account' }
 */
userRouter.get('/:userId/account', async (req, res) => {
    const user = await User.getByRobloxId(req.params.userId);

    res.json({
        isAdmin: user ? user.isAdmin : false,
        bannedAt: user ? user.bannedAt : null,
        banReason: user ? user.banReason : null,
        banExpiresAt: user ? user.banExpiresAt : null,
    });
});

/**
 * @swagger
 * /{userId}/admin:
 *   post:
 *     summary: Grant a user admin privileges
 *     description: Creates a User record for this Roblox ID if one doesn't exist yet.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     responses:
 *       200:
 *         description: User granted admin successfully
 */
userRouter.post('/:userId/admin', async (req, res) => {
    const user = await User.makeAdmin(req.params.userId);
    res.json(user);
});

/**
 * @swagger
 * /{userId}/admin:
 *   delete:
 *     summary: Revoke a user's admin privileges
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Roblox user ID
 *     responses:
 *       200:
 *         description: User's admin privileges revoked successfully
 *       404:
 *         description: No user found for this ID
 */
userRouter.delete('/:userId/admin', async (req, res) => {
    try {
        const user = await User.removeAdmin(req.params.userId);
        res.json(user);
    } catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'No user found for this ID' });

        throw err;
    }
});

module.exports = userRouter;
