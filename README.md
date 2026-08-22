# Xea's Game Services

Shared backend (gateway + microservices) for Xea's Roblox games. This document is a brief summary of what's going on!

## Infrastructure

Microservices architecture - see `services/`:
- `communication/` - Uses Roblox's MessagingService to send messages between game servers
- `discord-webhook/` - Posts logging embeds (purchases, verified creators, etc.) to a Discord webhook
- `discord/` - A standalone Discord bot (not currently wired into the gateway/deployment)
- `economy/` - Records in-game transactions (not yet implemented - stub only)
- `proxy/` - Forwards requests to Roblox with rotating proxies to avoid rate limits
- `users/` - CRUD operations for user data (identity/moderation + per-game stats)

Services are deployed using Docker Compose and run on a VPS/Pi. A `gateway/` service routes requests to the appropriate service and handles authentication.

Outside of the services, `shared/` holds packages installed across multiple services:
- `logger/` - Logs to console and files, with different log levels
- `database/` - Initialises a Prisma/Postgres connection and performs queries

**Multi-tenant:** each game gets its own `Game` row (own gateway token, Roblox universe/Open Cloud key, Discord webhook) instead of sharing one set of env vars. The gateway resolves the caller's token to a game and forwards its config downstream as headers. Onboard a new game with `npm run create-game -- <slug> <name>` from `shared/database`.

## Deployment

Create `.env` files where `.env.example` files are provided (`deployment/.env` is the main one - it feeds the other services' secrets through Docker Compose). Then, from `deployment/`, run `docker compose up -d`.
