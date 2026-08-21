module.exports = (proxy, routes) => (req, res) => {
    // Match on a full path segment (exact, or followed by '/') so a shorter prefix like
    // /discord can't shadow a longer one like /discord-webhook. Prefer the longest match.
    const servicePath = Object.keys(routes)
        .filter(url => req.path === url || req.path.startsWith(`${url}/`))
        .sort((a, b) => b.length - a.length)[0];

    if(!servicePath)
        return res.status(404).json({ error: "Gateway route not found" });

    const target = routes[servicePath].origin;

    // Strip the service prefix so the downstream service sees e.g. /track instead of /discord-webhook/track
    const strippedUrl = req.url.slice(servicePath.length) || '/';
    req.url = strippedUrl.startsWith('/') ? strippedUrl : `/${strippedUrl}`;

    proxy.web(req, res, { target, changeOrigin: true, timeout: 10000 }, (err) => {
        const status = err.code === 'ECONNREFUSED' ? 503 : 502;
        const message = err.code === 'ECONNREFUSED' ? 'Service unavailable' : 'Bad gateway';
        res.status(status).json({ error: message });
    });
}
