const { COOKIE_NAME, verify } = require('../lib/session');
const { isAdmin } = require('../lib/admins');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Whether a request came from this dashboard's own pages. Browsers send Origin with every write; another site's
// page can't make it name this host. The session cookie is SameSite=Lax too, which already keeps it off cross-site
// POSTs, so this is a second lock on the same door
function isSameOrigin(req) {
    const origin = req.get('origin');
    if (!origin) return false;

    let host;
    try {
        host = new URL(origin).host;
    } catch {
        return false;
    }

    // Behind the Cloudflare tunnel the Host header is the public one; X-Forwarded-Host covers a proxy that rewrites it
    return host === req.get('host') || host === req.get('x-forwarded-host');
}

// Lets a request through only for a signed-in dashboard admin. The account is checked against ADMINS on every
// request, not only at sign-in, so taking someone out of the list locks them out at once, whatever cookie they hold
function requireAuth(req, res, next) {
    const session = verify(req.cookies?.[COOKIE_NAME], process.env.DASHBOARD_SESSION_SECRET);

    if (!session) return res.status(401).json({ error: 'Not authenticated' });
    if (!isAdmin(session.userId)) return res.status(403).json({ error: 'This account may not use the dashboard' });
    if (!SAFE_METHODS.has(req.method) && !isSameOrigin(req))
        return res.status(403).json({ error: 'Refused a write that did not come from the dashboard itself' });

    req.session = session;
    next();
}

module.exports = requireAuth;