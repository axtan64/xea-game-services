const { fetch, ProxyAgent } = require('undici');
const { proxies, pickProxies } = require('./proxyPool');

const MAX_ATTEMPTS = Math.min(3, proxies.length);

// Fetches a URL through a randomly chosen proxy from the pool. If the proxy is
// unreachable, or Roblox responds with a rate limit / server error, retries
// through a different proxy (up to MAX_ATTEMPTS) rather than failing immediately.
async function fetchWithRotation(url, options = {}) {
    if (proxies.length === 0)
        throw new Error('No proxies configured (set PROXIES in .env)');

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
