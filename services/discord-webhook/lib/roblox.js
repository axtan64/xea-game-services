function profileUrl(userId) {
    return `https://www.roblox.com/users/${userId}/profile`;
}

// Best-effort: if the thumbnail can't be resolved, the embed is still sent without one.
async function getAvatarThumbnailUrl(userId) {
    try {
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=png&isCircular=false`;
        const res = await fetch(url);

        if (!res.ok) return null;

        const body = await res.json();
        return body.data?.[0]?.imageUrl ?? null;
    } catch {
        return null;
    }
}

module.exports = { profileUrl, getAvatarThumbnailUrl };
