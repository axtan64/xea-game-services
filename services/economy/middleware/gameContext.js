const { STATS_MODELS_BY_SLUG } = require('database');

/**
 * Decode the game context from the request headers set by the gateway service
 */
module.exports = function gameContext(req, res, next) {
    const gameId = req.headers['x-game-id'];
    const gameSlug = req.headers['x-game-slug'];

    if (!gameId || !gameSlug)
        return res.status(400).json({ error: 'Missing game context (x-game-id/x-game-slug headers)' });

    const stats = STATS_MODELS_BY_SLUG[gameSlug];

    if (!stats)
        return res.status(400).json({ error: `No stats model registered for game "${gameSlug}"` });

    req.gameId = gameId;
    req.gameSlug = gameSlug;
    req.stats = stats;

    next();
}