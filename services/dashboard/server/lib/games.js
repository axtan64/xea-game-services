const { Game } = require('database');
const { isMessagingReady } = require('./communication');

// How long a city's lock holds without a save or heartbeat. Must match LOCK_STALE_MS in services/users/api/slots.js
const LIVE_WITHIN_MS = 150 * 1000;

function mask(value) {
    if (!value) return null;
    if (value.length <= 8) return '••••••••';
    return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

// What the dashboard's pages may see of a game: never its gateway token hash or its Open Cloud key, only whether
// the key is set and a masked view of it
function describeGame(game) {
    return {
        slug: game.slug,
        name: game.name,
        universeId: game.robloxUniverseId != null ? String(game.robloxUniverseId) : null,
        hasApiKey: Boolean(game.robloxOpenCloudApiKey),
        apiKeyMasked: mask(game.robloxOpenCloudApiKey),
        messagingReady: isMessagingReady(game),
    };
}

// Puts the game named by the :slug route parameter on req.game, or answers 404
async function loadGame(req, res, next) {
    const game = await Game.getBySlug(String(req.params.slug));
    if (!game) return res.status(404).json({ error: `No game "${req.params.slug}"` });

    req.game = game;
    next();
}

module.exports = { LIVE_WITHIN_MS, describeGame, loadGame };