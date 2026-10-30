const crypto = require('crypto');

const COOKIE_NAME = 'dashboard_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload, secret) {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
}

// Verify a signed session token, returning its payload or null if missing/invalid/expired
function verify(token, secret) {
    if (!token) return null;

    const [data, sig] = token.split('.');
    if (!data || !sig) return null;

    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    try {
        const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
        if (!payload.exp || Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

function createSessionCookieValue(profile, secret) {
    return sign({ ...profile, exp: Date.now() + MAX_AGE_MS }, secret);
}

module.exports = { COOKIE_NAME, MAX_AGE_MS, createSessionCookieValue, verify };