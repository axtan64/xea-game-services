// Roblox's public web APIs, for naming and picturing the players the dashboard lists. Profiles are cached for a
// while, since a page of purchases or cities names the same people again and again, and Roblox rate-limits these
const PROFILE_TTL_MS = 10 * 60 * 1000;
// Roblox takes at most this many user IDs in one request
const BATCH = 100;

const cache = new Map(); // userId -> { at, profile }

const isUserId = (value) => /^\d{1,19}$/.test(String(value));

async function postJson(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.ok ? res.json() : null;
}

async function getJson(url) {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
}

// The user ID for a username, or null if nobody is called that
async function findUserIdByUsername(username) {
    const data = await postJson('https://users.roblox.com/v1/usernames/users', {
        usernames: [username],
        excludeBannedUsers: false,
    });
    const id = data?.data?.[0]?.id;
    return id != null ? String(id) : null;
}

// Fetches the profiles of up to BATCH users not in the cache
async function fetchBatch(userIds) {
    const [users, avatars] = await Promise.all([
        postJson('https://users.roblox.com/v1/users', { userIds: userIds.map(Number), excludeBannedUsers: false }),
        getJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(',')}&size=150x150&format=png&isCircular=false`),
    ]);

    const names = new Map((users?.data ?? []).map((user) => [String(user.id), user]));
    const pictures = new Map((avatars?.data ?? []).map((avatar) => [String(avatar.targetId), avatar.imageUrl]));

    for (const userId of userIds) {
        const user = names.get(userId);
        const profile = {
            userId,
            name: user?.displayName ?? null,
            username: user?.name ?? null,
            picture: pictures.get(userId) ?? null,
        };
        // A failed lookup isn't cached, so the next page tries again
        if (users) cache.set(userId, { at: Date.now(), profile });
    }
}

// Profiles for many users at once, keyed by user ID as a string: { userId, name, username, picture }, with nulls
// where Roblox didn't answer
async function getProfiles(userIds) {
    const wanted = [...new Set(userIds.map(String))].filter(isUserId);
    const now = Date.now();
    const missing = wanted.filter((userId) => {
        const entry = cache.get(userId);
        return !entry || now - entry.at > PROFILE_TTL_MS;
    });

    for (let start = 0; start < missing.length; start += BATCH) {
        try {
            await fetchBatch(missing.slice(start, start + BATCH));
        } catch (err) {
            console.error('Roblox profile lookup failed:', err);
        }
    }

    const profiles = {};
    for (const userId of wanted)
        profiles[userId] = cache.get(userId)?.profile ?? { userId, name: null, username: null, picture: null };
    return profiles;
}

module.exports = { isUserId, findUserIdByUsername, getProfiles };