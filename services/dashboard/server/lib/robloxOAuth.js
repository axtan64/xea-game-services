const crypto = require('crypto');

const AUTHORIZE_URL = 'https://apis.roblox.com/oauth/v1/authorize';
const TOKEN_URL = 'https://apis.roblox.com/oauth/v1/token';
const USERINFO_URL = 'https://apis.roblox.com/oauth/v1/userinfo';

function generatePkcePair() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

function buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge }) {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile',
        response_type: 'code',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCodeForToken({ clientId, clientSecret, redirectUri, code, verifier }) {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: verifier,
    });

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!res.ok) throw new Error(`Roblox token exchange failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function fetchUserInfo(accessToken) {
    const res = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error(`Roblox userinfo fetch failed: ${res.status} ${await res.text()}`);
    return res.json();
}

module.exports = { generatePkcePair, buildAuthorizeUrl, exchangeCodeForToken, fetchUserInfo };