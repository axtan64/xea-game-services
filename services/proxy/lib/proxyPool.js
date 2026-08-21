// Parses PROXIES from env, formatted as Webshare's raw export: host:port:username:password,host:port:username:password,...
function parseProxies(raw) {
    if (!raw) return [];

    return raw.split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [host, port, username, password] = entry.split(':');
            return `http://${username}:${password}@${host}:${port}`;
        });
}

const proxies = parseProxies(process.env.PROXIES);

// Returns up to `count` distinct proxies in random order, for use as a retry sequence.
function pickProxies(count) {
    const pool = [...proxies];
    const picked = [];

    while (picked.length < count && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(index, 1)[0]);
    }

    return picked;
}

module.exports = { proxies, pickProxies };
