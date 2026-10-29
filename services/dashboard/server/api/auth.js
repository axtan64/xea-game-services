const { Router } = require('express');
const crypto = require('crypto');
const { generatePkcePair, buildAuthorizeUrl, exchangeCodeForToken, fetchUserInfo } = require('../lib/robloxOAuth');
const { COOKIE_NAME, MAX_AGE_MS, createSessionCookieValue, verify } = require('../lib/session');

const authRouter = Router();

// In-flight OAuth attempts (state -> {verifier, expiresAt}). In-memory is fine here - this is a
// single-admin, low-traffic dashboard, and entries are short-lived and self-expiring.
const pending = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000;

function cleanupPending() {
    const now = Date.now();
    for (const [state, entry] of pending) {
        if (entry.expiresAt < now) pending.delete(state);
    }
}

authRouter.get('/login', (req, res) => {
    cleanupPending();

    const state = crypto.randomBytes(16).toString('base64url');
    const { verifier, challenge } = generatePkcePair();
    pending.set(state, { verifier, expiresAt: Date.now() + PENDING_TTL_MS });

    const url = buildAuthorizeUrl({
        clientId: process.env.ROBLOX_OAUTH_CLIENT_ID,
        redirectUri: process.env.ROBLOX_OAUTH_REDIRECT_URI,
        state,
        codeChallenge: challenge,
    });

    res.redirect(url);
});

authRouter.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) return res.status(400).send(`Roblox OAuth error: ${error}`);

    const entry = state && pending.get(String(state));
    if (!entry) return res.status(400).send('Invalid or expired sign-in attempt - please try again.');
    pending.delete(String(state));

    try {
        const token = await exchangeCodeForToken({
            clientId: process.env.ROBLOX_OAUTH_CLIENT_ID,
            clientSecret: process.env.ROBLOX_OAUTH_CLIENT_SECRET,
            redirectUri: process.env.ROBLOX_OAUTH_REDIRECT_URI,
            code: String(code),
            verifier: entry.verifier,
        });

        const userInfo = await fetchUserInfo(token.access_token);

        if (String(userInfo.sub) !== String(process.env.ROBLOX_ADMIN_USER_ID))
            return res.status(403).send('This Roblox account is not permitted to access this dashboard.');

        const cookieValue = createSessionCookieValue(userInfo.sub, process.env.DASHBOARD_SESSION_SECRET);
        res.cookie(COOKIE_NAME, cookieValue, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: MAX_AGE_MS,
        });

        res.redirect('/');
    } catch (err) {
        console.error('OAuth callback failed:', err);
        res.status(500).send('Failed to complete sign-in. Please try again.');
    }
});

authRouter.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
    const session = verify(req.cookies?.[COOKIE_NAME], process.env.DASHBOARD_SESSION_SECRET);
    res.json({ authenticated: Boolean(session), userId: session?.userId ?? null });
});

module.exports = authRouter;