const { Router } = require('express');
const { isGroupMember } = require('../lib/roblox');

const groupsRouter = Router();

/**
 * @swagger
 * /groups/{groupId}/users/{userId}/member:
 *   get:
 *     summary: Check if a user is a member of a group
 *     description: Extends the Roblox API - pages the user's group roles via a rotating proxy and checks for the given group.
 *     tags:
 *       - Groups
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Roblox group ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Roblox user ID
 *     responses:
 *       200:
 *         description: Lookup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 groupId:
 *                   type: string
 *                 isMember:
 *                   type: boolean
 *       502:
 *         description: Could not reach the Roblox API through any proxy
 */
groupsRouter.get('/:groupId/users/:userId/member', async (req, res) => {
    const { groupId, userId } = req.params;

    try {
        const isMember = await isGroupMember(userId, groupId);
        res.json({ userId, groupId, isMember });
    } catch (err) {
        console.error('Error checking group membership:', err);
        res.status(502).json({ error: 'Failed to reach Roblox API' });
    }
});

module.exports = groupsRouter;
