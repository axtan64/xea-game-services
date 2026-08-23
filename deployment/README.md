Two kinds of config live outside the code, and they work differently:

**Per-game config** (Roblox universe/Open Cloud key, gateway token) isn't in env vars at all -
it's a `Game` row (see `shared/database/models/Game.js`), forwarded downstream by the gateway as
`X-Game-*` headers. Nothing here needs it. To onboard a game:

```bash
cd shared/database
npm run create-game -- <slug> <name>
```

The gateway token it prints goes straight into that game's `ROBLOX_AUTH` flag. Then fill in its Roblox config:

```bash
npm run update-game -- <slug> --universe-id '<ROBLOX_UNIVERSE_ID>' --api-key '<ROBLOX_OPEN_CLOUD_API_KEY>'
```

(use `--token '<new token>'` to rotate / set the gateway token)