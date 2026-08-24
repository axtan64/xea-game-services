const { fetch, ProxyAgent } = require('undici');
const { proxies, pickProxies } = require('./proxyPool');

const MAX_ATTEMPTS = Math.min(3, proxies.length);

let warnedNoProxies = false;

/**
 * Fetch a URL from a randomly chosen proxy (will keep retrying w/ new ones if rate limited). 
 * Fallback to an unproxied request if no proxies are configured.
 */
async function fetchWithRotation(url, options = {}) {
    if (proxies.length === 0) {
        if (!warnedNoProxies) {
            console.warn('PROXIES is not set - making requests directly with no proxy. This is fine for light/dev use, but Roblox will rate-limit a single IP under real traffic.');
            warnedNoProxies = true;
        }

        return fetch(url, options);
    }

    const candidates = pickProxies(MAX_ATTEMPTS);
    let lastError;

    for (const proxyUrl of candidates) {
        const dispatcher = new ProxyAgent(proxyUrl);

        try {
            const res = await fetch(url, { ...options, dispatcher });

            if (res.status === 429 || res.status >= 500) {
                lastError = new Error(`Upstream responded ${res.status} via proxy`);
                continue;
            }

            return res;
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('All proxy attempts failed');
}

module.exports = { fetchWithRotation };
