const { Router } = require('express');
const { audit } = require('../lib/audit');
const { PublishError, announce } = require('../lib/communication');

const announceRouter = Router({ mergeParams: true });

// The game clips anything longer (Clean Up The City: Services/Admin/Notices' MAX_TEXT, in bytes)
const MAX_MESSAGE_BYTES = 300;

// Shows an announcement in every live server of the game, as the in-game /announce global does: from the signed-in
// admin (their headshot, name and DEVELOPER chip), or from "The developers" with the game's icon if fromTeam is set
announceRouter.post('/', async (req, res) => {
    const { message, fromTeam } = req.body ?? {};
    const text = typeof message === 'string' ? message.trim() : '';

    if (!text) return res.status(400).json({ error: 'Write the announcement first' });
    if (Buffer.byteLength(text, 'utf8') > MAX_MESSAGE_BYTES)
        return res.status(400).json({ error: `An announcement is at most ${MAX_MESSAGE_BYTES} bytes` });

    const senderId = fromTeam === true ? 0 : req.session.userId;

    try {
        await announce(req.game, senderId, text);
    } catch (err) {
        if (err instanceof PublishError) return res.status(err.status >= 500 ? 502 : 400).json({ error: err.message });
        throw err;
    }

    audit(req, 'announce', { game: req.game.slug, senderId: String(senderId), message: text });
    res.json({ ok: true });
});

module.exports = announceRouter;