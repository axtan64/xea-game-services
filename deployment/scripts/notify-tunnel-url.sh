#!/bin/sh
# Detects the current Cloudflare quick tunnel URL and posts a Discord embed (via the
# discord-webhook service's /tunnel endpoint) whenever it changes.
#
# Intended to run on a schedule (cron/systemd timer) directly on the host, independent of
# deploys - so a tunnel restart/crash between deploys gets noticed promptly, not just whenever
# code is next pushed. See ../../.github/workflows/deploy.yml for the deploy-time URL echo.

set -eu

cd "$(dirname "$0")/.." # deployment/

STATE_FILE="${HOME}/.cache/xea-mining-tunnel-url"
mkdir -p "$(dirname "$STATE_FILE")"

CURRENT_URL=$(docker compose logs cloudflared 2>&1 | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | tail -n 1)

if [ -z "$CURRENT_URL" ]; then
    exit 0 # No URL logged yet (e.g. tunnel still starting) - nothing to report
fi

LAST_URL=""
[ -f "$STATE_FILE" ] && LAST_URL=$(cat "$STATE_FILE")

if [ "$CURRENT_URL" = "$LAST_URL" ]; then
    exit 0 # No change
fi

# Reuse the users service's image (already built, has Node's built-in fetch) rather than adding
# a curl dependency anywhere - same trick as the "Run database migrations" deploy step
docker compose run --rm -T users node -e "
fetch('http://discord-webhook:3006/tunnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: '$CURRENT_URL' }),
}).then((res) => {
    if (!res.ok) { console.error('discord-webhook responded', res.status); process.exit(1); }
});
"

echo "$CURRENT_URL" > "$STATE_FILE"
