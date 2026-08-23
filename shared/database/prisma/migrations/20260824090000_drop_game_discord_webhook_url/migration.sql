-- AlterTable
-- Discord webhook URLs are per-channel env config on discord-webhook now, not per-game - see
-- services/discord-webhook/.env.example. A Discord server has a fixed set of channels/webhooks
-- regardless of how many games post into them, so this was never really game-scoped data.
ALTER TABLE "Game" DROP COLUMN "discordWebhookUrl";
