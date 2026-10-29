const { Setting } = require('database');

const SETTING_KEY = 'ROBLOX_BOT_COOKIE';

/**
 * Resolve the Roblox bot account's .ROBLOSECURITY cookie (will search the setting first)
 * @returns {Promise<string|undefined>}
 */
async function getRobloxBotCookie() {
    try {
        return await Setting.getOrDefault(SETTING_KEY, process.env.ROBLOX_BOT_COOKIE);
    } catch (err) {
        console.error('Error reading ROBLOX_BOT_COOKIE setting, falling back to env var:', err);
        return process.env.ROBLOX_BOT_COOKIE;
    }
}

module.exports = { getRobloxBotCookie };
