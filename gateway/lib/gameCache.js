/**
 * Responsible for caching a map which translates ROBLOX_AUTH tokens into their respective game
 */

const { Game } = require('database');

const REFRESH_INTERVAL_MS = 30_000;

let gamesByTokenHash = new Map();
let lastRefresh = 0;
let refreshPromise = null;

/**
 * Update the cache by mapping the hashed token of each Game to the game itself
 */
async function refresh() {
    const games = await Game.findAll();
    const next = new Map();

    for (const game of games)
        next.set(game.gatewayTokenHash, game);

    gamesByTokenHash = next;
    lastRefresh = Date.now();
}

/**
 * Once called, update the cache if it's old, else do nothing
 */
async function ensureFresh() {
    if (Date.now() - lastRefresh < REFRESH_INTERVAL_MS)
        return;

    if (!refreshPromise)
        refreshPromise = refresh().finally(() => { refreshPromise = null; });

    await refreshPromise;
}

async function resolveGameByTokenHash(tokenHash) {
    await ensureFresh();
    return gamesByTokenHash.get(tokenHash) || null;
}

module.exports = { resolveGameByTokenHash };