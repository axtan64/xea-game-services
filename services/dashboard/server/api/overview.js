const { Router } = require('express');
const { CutcPlayerStats, CutcSaveSlot, Game, Purchase } = require('database');
const { describePurchase, purchasePeople } = require('../lib/describe');
const { LIVE_WITHIN_MS, describeGame } = require('../lib/games');
const { getProfiles } = require('../lib/roblox');
const { totals } = require('./purchases');

const overviewRouter = Router();

const RECENT = 8;

// The home page: every game and whether it can publish messages, Clean Up The City's players and live cities, and sales across all games
overviewRouter.get('/', async (req, res) => {
    const [games, players, live, sums, recent] = await Promise.all([
        Game.findAll(),
        CutcPlayerStats.count(),
        CutcSaveSlot.live(LIVE_WITHIN_MS),
        totals(),
        Purchase.recent({ take: RECENT }),
    ]);
    const people = await getProfiles(purchasePeople(recent));

    res.json({
        games: games.map(describeGame).sort((a, b) => a.name.localeCompare(b.name)),
        cutc: {
            players,
            liveCities: live.length,
            playersInCities: live.reduce((sum, slot) => sum + slot.playerCount, 0),
        },
        totals: sums,
        recent: recent.map((purchase) => describePurchase(purchase, people)),
    });
});

module.exports = overviewRouter;