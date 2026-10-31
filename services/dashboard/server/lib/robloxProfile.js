// Resolves a Roblox user's display profile (name, username, avatar) via Roblox's public
// Users/Thumbnails APIs rather than the OAuth userinfo claims, which can come back null/missing
// (see services/discord-bot/lib/roblox.js's getAvatarThumbnailUrl for the proven-reliable precedent).
async function getRobloxProfile(userId) {
    const [userRes, avatarRes] = await Promise.all([
        fetch(`https://users.roblox.com/v1/users/${userId}`),
        fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=png&isCircular=false`),
    ]);

    const user = userRes.ok ? await userRes.json() : null;
    const avatar = avatarRes.ok ? await avatarRes.json() : null;

    return {
        name: user?.displayName ?? null,
        username: user?.name ?? null,
        picture: avatar?.data?.[0]?.imageUrl ?? null,
    };
}

module.exports = { getRobloxProfile };
