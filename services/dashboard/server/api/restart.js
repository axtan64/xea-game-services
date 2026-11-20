const { Router } = require('express');
const { audit } = require('../lib/audit');
const { PublishError, softRestart } = require('../lib/communication');

const restartRouter = Router({ mergeParams: true });

// Soft restarts every live server of the game: each saves and moves its players on to a fresh server running the
// latest published version (Clean Up The City: Systems/Shutdown/SoftRestarting). Nobody loses progress, but everyone
// sits through a teleport, so the page asks first
restartRouter.post('/', async (req, res) => {
    try {
        await softRestart(req.game, req.session.userId);
    } catch (err) {
        if (err instanceof PublishError) return res.status(err.status >= 500 ? 502 : 400).json({ error: err.message });
        throw err;
    }

    audit(req, 'soft-restart', { game: req.game.slug });
    res.json({ ok: true });
});

module.exports = restartRouter;
