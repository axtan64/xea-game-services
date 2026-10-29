const { Router } = require('express');
const { Setting } = require('database');
const requireAuth = require('../middleware/requireAuth');

const settingsRouter = Router();

// The service should only be allowed to edit these keys
const ALLOWED_KEYS = ['ROBLOX_BOT_COOKIE'];

function mask(value) {
    if (!value) return null;
    if (value.length <= 8) return '••••••••';
    return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

settingsRouter.get('/', requireAuth, async (req, res) => {
    const settings = {};

    for (const key of ALLOWED_KEYS) {
        const value = await Setting.get(key);
        settings[key] = { set: Boolean(value), masked: mask(value) };
    }

    res.json(settings);
});

settingsRouter.put('/:key', requireAuth, async (req, res) => {
    const { key } = req.params;
    const { value } = req.body ?? {};

    if (!ALLOWED_KEYS.includes(key)) return res.status(404).json({ error: `Unknown setting "${key}"` });
    if (typeof value !== 'string' || !value) return res.status(400).json({ error: 'value (non-empty string) is required' });

    await Setting.set(key, value);
    res.json({ ok: true, masked: mask(value) });
});

module.exports = settingsRouter;