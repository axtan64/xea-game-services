const { Router } = require('express');
const { CutcSaveSlot } = require('database');
const { describeSlot } = require('../lib/describe');
const { LIVE_WITHIN_MS } = require('../lib/games');
const { getProfiles } = require('../lib/roblox');

const citiesRouter = Router({ mergeParams: true });

// Every city being played now (Clean Up The City only): its owner, slot, who is in it and how far it has come.
// Who is in it comes from each save and heartbeat; a server from before that was added names nobody
citiesRouter.get('/', async (req, res) => {
    if (req.game.slug !== 'cutc') return res.json({ supported: false, cities: [] });

    const slots = await CutcSaveSlot.live(LIVE_WITHIN_MS);
    const playersOf = (slot) => (Array.isArray(slot.players) ? slot.players.map(String) : []);
    const people = await getProfiles(slots.flatMap((slot) => [String(slot.ownerId), ...playersOf(slot)]));

    res.json({
        supported: true,
        cities: slots.map((slot) => ({
            ...describeSlot(slot),
            owner: people[String(slot.ownerId)],
            players: playersOf(slot).map((userId) => people[userId]),
        })),
    });
});

module.exports = citiesRouter;