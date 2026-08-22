const { hashGatewayToken } = require('database/lib/hashToken');
const { resolveGameByTokenHash } = require('../lib/gameCache');

module.exports = async function(req, res, next) {
    const authorization = req.headers["authorization"]

    if(!authorization || !authorization.startsWith("Bearer "))
        return res.status(401).json({ error: "Unauthorized" });

    const token = authorization.split(" ")[1];

    let game;
    try {
        game = await resolveGameByTokenHash(hashGatewayToken(token))
    } catch(err) {
        console.error('Failed to resolve game for gateway token:', err);
        return res.status(500).json({ error: "Internal error" });
    }

    if(!game)
        return res.status(403).json({ error: "Invalid API key" });

    req.game = game;

    next()
}