const { Router } = require('express');
const { CutcSaveSlot } = require('database');
const { describeSlot } = require('../lib/describe');
const { LIVE_WITHIN_MS } = require('../lib/games');
const joinLinks = require('../lib/joinLinks');
const { getProfiles } = require('../lib/roblox');

const citiesRouter = Router({ mergeParams: true });

// Every city being played now (Clean Up The City only): its owner, slot, who is in it and how far it has come.
// Who is in it comes from each save and heartbeat; a server from before that was added names nobody. Each has a
// link that starts Roblox in the lobby, naming the city for the lobby to send the player on (lib/joinLinks)
citiesRouter.get('/', async (req, res) => {
    if (req.game.slug !== 'cutc') return res.json({ supported: false, cities: [] });

    const slots = await CutcSaveSlot.live(LIVE_WITHIN_MS);
    const playersOf = (slot) => (Array.isArray(slot.players) ? slot.players.map(String) : []);
    const [people, links] = await Promise.all([
        getProfiles(slots.flatMap((slot) => [String(slot.ownerId), ...playersOf(slot)])),
        joinLinks.forGame(req.game),
    ]);

    res.json({
        supported: true,
        canJoin: Boolean(links),
        cities: slots.map((slot) => ({
            ...describeSlot(slot),
            owner: people[String(slot.ownerId)],
            players: playersOf(slot).map((userId) => people[userId]),
            joinUrl: links ? links.city(slot.ownerId, slot.slot) : null,
        })),
    });
});

module.exports = citiesRouter;