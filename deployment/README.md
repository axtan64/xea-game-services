ROBLOX_AUTH, DISCORD_WEBHOOK_URL, ROBLOX_UNIVERSE_ID, and ROBLOX_OPEN_CLOUD_API_KEY used to
live here, but none of it is read from env by a running service anymore - it's all per-game
config on a Game row now (see shared/database/models/Game.js and the gateway's X-Game-*
header forwarding in gateway/middleware/forwarder.js). To onboard a game:
#
#   cd shared/database && npm run create-game -- <slug> <name>
#
# then fill in that Game's robloxUniverseId/robloxOpenCloudApiKey/discordWebhookUrl via
# Game.update(slug, {...}). The gateway token it prints goes straight into that game's
# ROBLOX_AUTH flag - nothing here needs it.

No environment variables are necessary for deployment here. Games can be registered to authenticate with the service instead.

To setup a game:
```cd shared/database && npm run create-game -- <slug> <name>```

Then fill in that Game's robloxUniverseId/robloxOpenCloudApiKey/discordWebhookUrl via Game.update(slug, {...}).

The gateway token the script prints should be put in the ROBLOX_AUTH flag of the game, so Roblox servers can authenticate themselves