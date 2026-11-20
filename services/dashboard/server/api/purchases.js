const { Router } = require('express');
const { Game, Purchase } = require('database');
const { describePurchase, purchasePeople } = require('../lib/describe');
const { getProfiles } = require('../lib/roblox');

const purchasesRouter = Router();

const HOUR_MS = 60 * 60 * 1000;
const PERIODS = { day: 24 * HOUR_MS, week: 7 * 24 * HOUR_MS, month: 30 * 24 * HOUR_MS };
const DEFAULT_TAKE = 100;
const MOST_TAKE = 500;

// Sales over the last day, week and month: how many, and the Robux paid before Roblox's cut. Grants aren't sales
async function totals(gameId) {
    const entries = await Promise.all(
        Object.entries(PERIODS).map(async ([name, ms]) => [name, await Purchase.totalSince(new Date(Date.now() - ms), gameId)]),
    );
    return Object.fromEntries(entries);
}

// The purchase log, newest first, for one game (?game=slug) or all of them
purchasesRouter.get('/', async (req, res) => {
    const slug = req.query.game ? String(req.query.game) : null;
    const game = slug ? await Game.getBySlug(slug) : null;
    if (slug && !game) return res.status(404).json({ error: `No game "${slug}"` });

    const asked = Number.parseInt(String(req.query.take ?? ''), 10);
    const take = Number.isInteger(asked) ? Math.min(Math.max(asked, 1), MOST_TAKE) : DEFAULT_TAKE;

    const [rows, sums] = await Promise.all([Purchase.recent({ gameId: game?.id, take }), totals(game?.id)]);
    const people = await getProfiles(purchasePeople(rows));

    res.json({ totals: sums, purchases: rows.map((purchase) => describePurchase(purchase, people)) });
});

module.exports = { purchasesRouter, totals };