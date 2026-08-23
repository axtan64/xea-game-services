Authenticate a game (and retrieve its token) by using this command

```bash
cd shared/database
npm run create-game -- <slug> <name>
```

The gateway token it prints goes straight into that game's `ROBLOX_AUTH` flag. Then fill in its Roblox config:

```bash
npm run update-game -- <slug> --universe-id '<ROBLOX_UNIVERSE_ID>' --api-key '<ROBLOX_OPEN_CLOUD_API_KEY>'
```

(use `--token '<new token>'` to rotate / set the gateway token)