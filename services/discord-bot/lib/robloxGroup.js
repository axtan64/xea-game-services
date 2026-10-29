const BASE_ECONOMY = 'https://economy.roblox.com';
const BASE_GROUPS = 'https://groups.roblox.com';
const BASE_THUMBS = 'https://thumbnails.roblox.com';

class RobloxAuthError extends Error {}

/**
 * @param {string} url
 * @param {string} cookie .ROBLOSECURITY value for the bot account
 */
async function robloxFetch(url, cookie) {
    const res = await fetch(url, { headers: { Cookie: `.ROBLOSECURITY=${cookie}` } });

    if (res.status === 401 || res.status === 403)
        throw new RobloxAuthError(`Roblox responded ${res.status} for ${url} - the bot cookie is likely stale/expired`);

    if (!res.ok)
        throw new Error(`Roblox responded ${res.status} for ${url}`);

    return res.json();
}

/**
 * @param {string|number} groupId
 * @param {string} cookie .ROBLOSECURITY value for a Roblox account with access to the group's funds page
 * @returns {Promise<{groupName: string, pending: number, total: number}>}
 */
async function getGroupFunds(groupId, cookie) {
    const [group, currency, revenue] = await Promise.all([
        robloxFetch(`${BASE_GROUPS}/v1/groups/${groupId}`, cookie),
        robloxFetch(`${BASE_ECONOMY}/v1/groups/${groupId}/currency`, cookie), // { robux: <total> }
        robloxFetch(`${BASE_ECONOMY}/v1/groups/${groupId}/revenue/summary/day`, cookie),
    ]);

    return {
        groupName: group.name,
        total: currency.robux,
        pending: revenue.pendingRobux ?? revenue.pending ?? 0,
    };
}

/**
 * @param {string|number} groupId
 * @param {string} cookie
 * @returns {Promise<string|null>}
 */
async function getGroupIconUrl(groupId, cookie) {
    const body = await robloxFetch(`${BASE_THUMBS}/v1/groups/icons?groupIds=${groupId}&size=150x150&format=png`, cookie);
    return body.data?.[0]?.imageUrl ?? null;
}

module.exports = { getGroupFunds, getGroupIconUrl, RobloxAuthError };