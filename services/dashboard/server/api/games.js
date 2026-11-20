const { Router } = require('express');
const { Game } = require('database');
const { audit } = require('../lib/audit');
const { describeGame, loadGame } = require('../lib/games');

const gamesRouter = Router();

// Open Cloud keys are long; anything past this isn't one
const MAX_KEY_LENGTH = 4000;

gamesRouter.get('/', async (req, res) => {
    const games = await Game.findAll();
    res.json(games.map(describeGame).sort((a, b) => a.name.localeCompare(b.name)));
});

// Sets the universe ID and Open Cloud key a game's cross-server messages (announcements, gifts, account changes)
// are published with. A missing or empty apiKey keeps the stored one, so changing the universe needs no key pasted
gamesRouter.put('/:slug/roblox', loadGame, async (req, res) => {
    const { universeId, apiKey } = req.body ?? {};

    if (universeId !== null && !/^\d{1,19}$/.test(String(universeId ?? '')))
        return res.status(400).json({ error: 'universeId must be a Roblox universe ID (digits), or null to clear it' });

    if (apiKey !== undefined && apiKey !== '' && (typeof apiKey !== 'string' || apiKey.length > MAX_KEY_LENGTH || /\s/.test(apiKey)))
        return res.status(400).json({ error: 'apiKey must be an Open Cloud API key, with no spaces' });

    const update = { robloxUniverseId: universeId };
    if (apiKey) update.robloxOpenCloudApiKey = apiKey;

    const game = await Game.update(req.game.slug, update);
    audit(req, 'set roblox config', { game: game.slug, universeId: universeId ?? null, keyChanged: Boolean(apiKey) });
    res.json(describeGame(game));
});

gamesRouter.delete('/:slug/roblox/key', loadGame, async (req, res) => {
    const game = await Game.update(req.game.slug, { robloxOpenCloudApiKey: null });
    audit(req, 'clear open cloud key', { game: game.slug });
    res.json(describeGame(game));
});

gamesRouter.use('/:slug/announce', loadGame, require('./announce'));
gamesRouter.use('/:slug/restart', loadGame, require('./restart'));
gamesRouter.use('/:slug/players', loadGame, require('./players'));
gamesRouter.use('/:slug/moderation', loadGame, require('./moderation'));
gamesRouter.use('/:slug/cities', loadGame, require('./cities'));

module.exports = gamesRouter;