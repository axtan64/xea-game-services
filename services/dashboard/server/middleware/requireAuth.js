const { COOKIE_NAME, verify } = require('../lib/session');

function requireAuth(req, res, next) {
    const session = verify(req.cookies?.[COOKIE_NAME], process.env.DASHBOARD_SESSION_SECRET);

    if (!session) return res.status(401).json({ error: 'Not authenticated' });

    req.session = session;
    next();
}

module.exports = requireAuth;