// Logs what a dashboard admin did, one JSON line each, so `docker compose logs dashboard` keeps a record of every
// ban, grant and announcement and who made it. Never pass secrets (API keys, cookies) in `details`
function audit(req, action, details = {}) {
    const entry = { at: new Date().toISOString(), by: String(req.session?.userId ?? 'unknown'), action, ...details };
    console.log(`[dashboard audit] ${JSON.stringify(entry)}`);
}

module.exports = { audit };