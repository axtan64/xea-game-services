# 🛠️ Xea's Game Services

This is the shared backend (gateway + microservices) originally built for [Xea's Mining Incremental](https://github.com/axtan64/xea-mining-incremental), split out into its own repository so it can be reused across multiple Roblox games rather than living inside one game's project.

**Current status:** this is a straight extraction of the mining game's backend. Every service still behaves as if there's exactly one Roblox game/universe on the other end (single `ROBLOX_AUTH` token, single `ROBLOX_UNIVERSE_ID`, etc.) - it isn't multi-tenant yet. That's expected near-term follow-up work, not something this repo already does. Don't assume a `gameId`/tenant concept exists anywhere in this code unless you've just added it.

## Infrastructure Overview

This is a microservices architecture, where each service (located in `services/`) is usually its own Express server, and serves a dedicated purpose. Services are deployed using Docker Compose (see `deployment/`), and are run on a VPS/Pi. A `gateway/` service is used to route requests to the appropriate services, and also handles authentication. Services should be documented with swagger where possible.

Outside of the services, there are some shared packages in `shared/` that are installed across multiple services:
- `logger/` - Used to log messages to the console and files, with different log levels (info, warning, error)
- `database/` - Used to initialise a connection to the database (Prisma/Postgres) and perform queries

Any endpoints must use appropriate status codes and response bodies that would be useful for a Roblox game server to make use of. These services operate in a Virtual Private Cloud (VPC), and as such, do not require their own authentication mechanisms - authentication is handled once, at the gateway.

## Gateway

**Route:** `gateway/`

The only exposed service - meant to be reached directly by Roblox game servers, and nothing else. Authorisation is via a single shared bearer token (`ROBLOX_AUTH`), and requests are routed by the prefix of the path, e.g.:

- `/communication/x/y/z` -> routed to `http://communication:3000/x/y/z`
- `/discord-webhook/x/y/z` -> routed to `http://discord-webhook:3000/x/y/z`

See `gateway/middleware/` for the auth check and the path-based forwarder, and `gateway/routes.js` for the prefix -> service mapping.

## Services

### Communication

**Route:** `services/communication/`

Uses Roblox's MessagingService to send messages between game servers, via their Open Cloud API. For example, sending a global announcement to all servers of a game. Currently configured for a single universe (`ROBLOX_UNIVERSE_ID` + `ROBLOX_OPEN_CLOUD_API_KEY` env vars) - a second game means either a second deployment of this service, or teaching it to look up universe/key by caller.

### Discord Webhook

**Route:** `services/discord-webhook/`

Uses a header-defined token to send messages to a Discord webhook. Used for logging particular types of events (a verified/video-star creator joining, a gamepass purchase, a dev product purchase, etc.) - each is its own POST endpoint, which builds and posts an embed or plaintext message. Other internal services may call this, but not for all endpoints (e.g. error logging).

### Discord (bot)

**Route:** `services/discord/`

A standalone Discord bot (slash commands, an LRU cache, a small local memories store) - separate from `discord-webhook/`, and not currently wired into `gateway/` or `deployment/docker-compose.yml`. Came along in the extraction for completeness; worth confirming with the game owner whether this is still active/wanted here before relying on it.

### Economy

**Route:** `services/economy/`

Intended for recording and storing in-game transactions (POST endpoints for gamepass/dev product purchases, backed by the `Purchase` model in `shared/database`) - **not yet implemented**. Only `.env`/`.env.example`/`package.json` exist right now, no actual server code.

### Proxy

**Route:** `services/proxy/`

Forwards requests to Roblox with rotating proxies to avoid rate limits (following, groups, likes, badges, verified status). Requests are proxied because Roblox doesn't allow some of these calls from inside a game server directly, and they have to be funnelled through a web server. This also lets the proxy "extend" the Roblox API with endpoints that don't otherwise exist. This service has no game-specific state at all - the strongest candidate for sharing across games as-is.

### Users

**Route:** `services/users/`

CRUD operations for user data - split into two concerns: generic identity/moderation (`User` model: ban, admin, account info - no game-specific fields), and per-game save data (`PlayerStats` model, currently shaped for the mining game: level/gold/progress/etc., validated against a known field allowlist rather than hardcoded per-route). The identity/moderation half is already game-agnostic; the stats half would need a second model (and a way to pick which one to use) to serve a second game from this same service.

## Deployment

See `deployment/docker-compose.yml` and `deployment/.env.example`. From `deployment/`: create a `.env` with the required secrets, then `docker compose up -d`. `deployment/scripts/notify-tunnel-url.sh` posts the current Cloudflare quick-tunnel URL to Discord whenever it changes (intended to run on a schedule on the host, independent of deploys).

`.github/workflows/deploy.yml` deploys to a self-hosted runner on push to `main`. **The `working-directory` paths in it are placeholders copied over from the mining game's workflow and almost certainly need updating** to wherever this repo actually gets cloned on the deploy host, and a self-hosted runner needs registering against *this* repo (Settings -> Actions -> Runners) before the workflow will run at all.
