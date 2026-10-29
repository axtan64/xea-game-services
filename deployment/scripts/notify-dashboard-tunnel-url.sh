#!/bin/sh
# Detects the dashboard's Cloudflare quick tunnel URL and, whenever it changes: updates
# ROBLOX_OAUTH_REDIRECT_URI in .env, restarts the `dashboard` container to pick it up, and posts
# the new URL to Discord (via discord-bot's /tunnel endpoint) as a reminder to paste it into the
# redirect URL field of the Roblox OAuth app's settings - that one step can't be automated from
# here, there's no API for it.
#
# Intended to run on a schedule (cron/systemd timer) directly on the host, same as
# notify-tunnel-url.sh (the gateway's equivalent) - independent of deploys, so a tunnel
# restart/crash between deploys gets noticed and fixed promptly.
#
# This is a stopgap for not having a paid/owned domain yet: swap cloudflared-dashboard for a named
# tunnel (see docker-compose.yml's history) once you do, and this script is no longer needed.

set -eu

cd "$(dirname "$0")/.." # deployment/

STATE_FILE="${HOME}/.cache/xea-dashboard-tunnel-url"
mkdir -p "$(dirname "$STATE_FILE")"

CURRENT_URL=$(docker compose logs cloudflared-dashboard 2>&1 | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | tail -n 1)

if [ -z "$CURRENT_URL" ]; then
    exit 0 # No URL logged yet (e.g. tunnel still starting) - nothing to report
fi

LAST_URL=""
[ -f "$STATE_FILE" ] && LAST_URL=$(cat "$STATE_FILE")

if [ "$CURRENT_URL" = "$LAST_URL" ]; then
    exit 0 # No change
fi

REDIRECT_URI="${CURRENT_URL}/auth/callback"

# Replace (or add) ROBLOX_OAUTH_REDIRECT_URI in .env without disturbing any other line/comment
if grep -q "^ROBLOX_OAUTH_REDIRECT_URI=" .env; then
    grep -v "^ROBLOX_OAUTH_REDIRECT_URI=" .env > .env.tmp
    mv .env.tmp .env
fi
printf 'ROBLOX_OAUTH_REDIRECT_URI=%s\n' "$REDIRECT_URI" >> .env

# Recreate the dashboard container so it picks up the new redirect URI - compose only recreates
# it because the resolved env value actually changed, not unconditionally
docker compose up -d dashboard

# Reuse the users service's image (already built, has Node's built-in fetch) rather than adding
# a curl dependency anywhere - same trick as the "Run database migrations" deploy step
docker compose run --rm -T users node -e "
fetch('http://discord-bot:3002/tunnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: '$CURRENT_URL',
        label: 'Dashboard',
        note: 'Update the redirect URL in the Roblox OAuth app settings to: $REDIRECT_URI',
    }),
}).then((res) => {
    if (!res.ok) { console.error('discord-bot responded', res.status); process.exit(1); }
});
"

echo "$CURRENT_URL" > "$STATE_FILE"
