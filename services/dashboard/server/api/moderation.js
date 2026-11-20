const { Router } = require('express');
const { GameMembership } = require('database');
const { describeMembership } = require('../lib/describe');
const { getProfiles } = require('../lib/roblox');
const robloxBans = require('../lib/robloxBans');

const moderationRouter = Router({ mergeParams: true });

// The players banned from a game: from Roblox for a game that bans through it (lib/robloxBans), else the database
async function readBans(game) {
    if (robloxBans.usesRobloxBans(game)) {
        try {
            return { bansWith: 'roblox', bans: await robloxBans.listBans(game), banError: null };
        } catch (err) {
            return { bansWith: 'roblox', bans: [], banError: err.message };
        }
    }
    const banned = await GameMembership.banned(game.id);
    return {
        bansWith: 'database',
        bans: banned.map((membership) => ({ userId: String(membership.user.robloxId), ...describeMembership(membership) })),
        banError: null,
    };
}

// The game's admins and the players banned from it. The game's owner isn't listed: the game knows them from Roblox
// (its creator, or rank 255 in its group), not from a membership row
moderationRouter.get('/', async (req, res) => {
    const [admins, { bansWith, bans, banError }] = await Promise.all([GameMembership.admins(req.game.id), readBans(req.game)]);
    const people = await getProfiles([...admins.map((membership) => String(membership.user.robloxId)), ...bans.map((entry) => entry.userId)]);

    res.json({
        admins: admins.map((membership) => ({ profile: people[String(membership.user.robloxId)], since: membership.updatedAt })),
        bansWith,
        banError,
        bans: bans.map(({ userId, privateReason, ...standing }) => ({ profile: people[userId], ...standing })),
    });
});

module.exports = moderationRouter;