# Deployment

Everything runs on the Pi with Docker Compose, from this folder (`~/Desktop/xea-game-services/deployment` on the Pi). Pushing to `main` deploys automatically (`.github/workflows/deploy.yml`): it builds the images, runs `prisma migrate deploy`, then `docker compose up -d`.

## Onboarding a new game

A game is a `Game` row in Postgres, holding its gateway token and its Roblox config. Its save data is a typed `<Game>PlayerStats` table. You'll need a short lowercase **slug** (for example `cutc`) and a display **name**.

### 1. Add the game's save data (code, then deploy)

The users service rejects a game whose slug has no stats model (`400 No stats model registered for game "<slug>"`), so this has to be deployed before the game can save. In this repo:

1. Add a `<Game>PlayerStats` model to `shared/database/prisma/schema.prisma`, copying an existing one such as `CutcPlayerStats`.
2. Add `shared/database/models/<Game>PlayerStats.js` with its `STAT_FIELDS`, copying a sibling.
3. Register it under the slug in `STATS_MODELS_BY_SLUG` in `shared/database/index.js`.
4. Write a `shared/database/prisma/migrations/<yyyymmddhhmmss>_add_<slug>_player_stats/migration.sql`, copying a sibling's format. Check the schema with `npx prisma validate` from `shared/database`.
5. Commit and push to `main`. (deploy applies migration)

### 2. Create the `Game` row and get its token (on the Pi)

Run the script **inside the running `users` container**. The container already has the database package installed and `DATABASE_URL` set.

```bash
ssh xyz@<pi-address>
cd ~/Desktop/xea-game-services/deployment
docker compose exec -w /app/shared/database users npm run create-game -- <slug> "<Game Name>"
```

It prints the game's id and its **gateway token, once**. Copy the token now. Only its hash is stored, so if you lose it you'll have to issue a new one (see Rotating a token). You can ignore warnings that `PROXIES` or `ROBLOX_BOT_COOKIE` "is not set".

The gateway reloads its list of games every 30 seconds, so the new token starts working within half a minute.

### 3. Miscellaneous

The game's base URL is the gateway's current tunnel URL. To print it:

```bash
docker compose logs cloudflared 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -n 1
```

### 4. Fill in the Roblox config (optional until you need cross-server messages)

`/communication/*` calls Open Cloud's MessagingService, so it needs the game's universe ID and an Open Cloud API key (Creator Hub > Open Cloud > API Keys) that has the Messaging Service API's Publish permission for that experience. Saving and loading work without them.

```bash
docker compose exec -w /app/shared/database users npm run update-game -- <slug> --universe-id '<UNIVERSE_ID>' --api-key '<OPEN_CLOUD_API_KEY>'
```

`update-game` only changes the fields you pass, and prints the updated row.

### 5. Check it works

```bash
curl -i -H "Authorization: Bearer <token>" "<tunnel-url>/users/1"
```

| Response | Meaning |
|---|---|
| `404 {"error":"No stats found for this user"}` | Working. The token matched, and the game's stats table was read (user 1 has never played). |
| `401` | The token is wrong, or the gateway hasn't reloaded yet. Wait 30 seconds and try again. |
| `400 No stats model registered` | Step 1 isn't deployed yet. |

To list the games that exist:

```bash
docker compose exec -T postgres psql -U mining -d mining -c 'select slug, name, "createdAt" from "Game";'
```

## Rotating a token

```bash
docker compose exec -w /app/shared/database users node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
docker compose exec -w /app/shared/database users npm run update-game -- <slug> --token '<new token>'
```

Then replace the secret in Creator Hub and Studio. The old token stops working within 30 seconds.

## Running the scripts from the host instead

Only do this if the containers aren't running. Postgres is exposed on the host's port 5432:

```bash
cd ~/Desktop/xea-game-services/shared/database
npm install
DATABASE_URL=postgresql://mining:mining@localhost:5432/mining npm run create-game -- <slug> "<Game Name>"
```