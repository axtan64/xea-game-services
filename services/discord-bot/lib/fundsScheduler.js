const { getGroupFunds, getGroupIconUrl, RobloxAuthError } = require('./robloxGroup');
const { getRobloxBotCookie } = require('./credentials');
const { buildFundsEmbed } = require('./embeds');
const { sendChannelEmbed } = require('./channelSend');

const INTERVAL_MS = 60_000;
const STALE_COOKIE_ALERT_THRESHOLD = 3; // consecutive auth failures before alerting (avoids spamming on a one-off blip)

let consecutiveAuthFailures = 0;

/**
 * Post the group funds embed to FUNDS_CHANNEL_ID every 60s (sends fail message if it fails X times in a row)
 * @param {import('discord.js').Client} client
 */
function startFundsScheduler(client) {
    setInterval(async () => {
        const channelId = process.env.FUNDS_CHANNEL_ID;
        const groupId = process.env.ROBLOX_GROUP_ID;

        if (!channelId || !groupId) return;

        try {
            const cookie = await getRobloxBotCookie();

            const [data, iconUrl] = await Promise.all([
                getGroupFunds(groupId, cookie),
                getGroupIconUrl(groupId, cookie),
            ]);

            await sendChannelEmbed(client, channelId, buildFundsEmbed({ ...data, iconUrl }));
            consecutiveAuthFailures = 0;
        } catch (err) {
            console.error('Funds scheduler error:', err);

            if (err instanceof RobloxAuthError) {
                consecutiveAuthFailures++;

                if (consecutiveAuthFailures === STALE_COOKIE_ALERT_THRESHOLD) {
                    try {
                        await sendChannelEmbed(client, channelId, {
                            title: '⚠️ Roblox bot cookie appears stale',
                            description: 'The /funds command and scheduled funds post have failed Roblox auth 3+ times in a row. The ROBLOX_BOT_COOKIE needs to be rotated.',
                            color: 0xed4245,
                        });
                    } catch {
                        // best-effort alert - nothing more to do if even this fails
                    }
                }
            } else {
                consecutiveAuthFailures = 0; // not an auth issue - don't let an unrelated error count toward the streak
            }
        }
    }, INTERVAL_MS);
}

module.exports = { startFundsScheduler };