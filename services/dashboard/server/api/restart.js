const { Router } = require('express');
const { CutcSaveSlot } = require('database');
const { audit } = require('../lib/audit');
const { PublishError, softRestart } = require('../lib/communication');
const { LIVE_WITHIN_MS } = require('../lib/games');

const restartRouter = Router({ mergeParams: true });

// The most cities one restart picks; the communication service takes up to 100 servers
const MAX_CITIES = 100;

// A save slot, 1 to 3
const isSlot = (value) => Number.isInteger(value) && value >= 1 && value <= 3;

const isLive = (slot) => slot.lockId != null && slot.lockedAt != null && Date.now() - new Date(slot.lockedAt).getTime() < LIVE_WITHIN_MS;

// Soft restarts live servers of the game: each saves and moves its players on to a fresh server running the latest
// published version (Clean Up The City: Systems/Shutdown/SoftRestarting). Nobody loses progress, but everyone sits
// through a teleport, so the page asks first.
//
// With no body it is every server. Clean Up The City's can be picked instead: `cities` ([{ ownerId, slot }], from the
// live cities list) and `lobbies` (true for every lobby). A city is reached by its server's JobId, the slot's
// lockId, looked up here so the page never holds it; one no longer being played is left out and answered in `gone`
restartRouter.post('/', async (req, res) => {
    const { cities, lobbies } = req.body ?? {};
    const isPicked = cities !== undefined || lobbies !== undefined;

    if (isPicked && req.game.slug !== 'cutc')
        return res.status(400).json({ error: `${req.game.name}'s servers can't be picked; restart every server instead` });

    if (cities !== undefined && (!Array.isArray(cities) || cities.length > MAX_CITIES
        || !cities.every((city) => /^\d{1,19}$/.test(String(city?.ownerId ?? '')) && isSlot(city?.slot))))
        return res.status(400).json({ error: `cities must be a list of up to ${MAX_CITIES} { ownerId, slot }` });

    if (lobbies !== undefined && typeof lobbies !== 'boolean')
        return res.status(400).json({ error: 'lobbies must be true or false' });

    if (isPicked && !cities?.length && lobbies !== true)
        return res.status(400).json({ error: 'Pick a city or the lobbies to restart' });

    let targets = {};
    let restarted = [];
    let gone = [];
    if (isPicked) {
        const keys = (cities ?? []).map((city) => ({ ownerId: String(city.ownerId), slot: city.slot }));
        const slots = await CutcSaveSlot.summaries(keys);
        const liveByKey = new Map(slots.filter(isLive).map((slot) => [`${slot.ownerId}:${slot.slot}`, slot]));
        const picked = [...new Set(keys.map(({ ownerId, slot }) => `${ownerId}:${slot}`))];

        restarted = picked.filter((key) => liveByKey.has(key));
        gone = picked.filter((key) => !liveByKey.has(key));
        if (restarted.length === 0 && lobbies !== true)
            return res.status(409).json({ error: 'None of those cities is being played now: refresh the list', gone });

        targets = {
            ...(restarted.length > 0 && { jobIds: restarted.map((key) => liveByKey.get(key).lockId) }),
            ...(lobbies === true && { lobbies: true }),
        };
    }

    try {
        await softRestart(req.game, req.session.userId, targets);
    } catch (err) {
        if (err instanceof PublishError) return res.status(err.status >= 500 ? 502 : 400).json({ error: err.message });
        throw err;
    }

    if (isPicked) audit(req, 'soft-restart', { game: req.game.slug, cities: restarted, lobbies: lobbies === true, gone });
    else audit(req, 'soft-restart', { game: req.game.slug, servers: 'all' });
    res.json({ ok: true, everyServer: !isPicked, cities: restarted.length, lobbies: lobbies === true, gone });
});

module.exports = restartRouter;
