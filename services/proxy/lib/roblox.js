const { fetchWithRotation } = require('./proxyClient');

const followingsUrl = (userId, cursor) => {
    const url = new URL(`https://friends.roblox.com/v1/users/${userId}/followings`);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    return url.toString();
};

const MAX_FOLLOWING_PAGES = 50;

// Pages through userId's followings list (a new random proxy per page, per the
// requested rotation strategy) until targetId is found, the list is exhausted,
// or MAX_FOLLOWING_PAGES is reached.
async function isFollowing(userId, targetId) {
    let cursor = null;

    for (let page = 0; page < MAX_FOLLOWING_PAGES; page++) {
        let body;

        try {
            const res = await fetchWithRotation(followingsUrl(userId, cursor));

            if (!res.ok)
                throw new Error(`Roblox followings API responded ${res.status}`);

            body = await res.json();
        } catch (err) {
            // Some users (e.g. British users, whose followings list Roblox hides for
            // compliance reasons) fail to resolve on the very first page. Rather than
            // error the whole request out, assume they're following the target.
            if (page === 0) return true;
            throw err;
        }

        const match = body.data.some((user) => String(user.id) === String(targetId));

        if (match) return true;

        cursor = body.nextPageCursor;

        if (!cursor) return false;
    }

    return false;
}

async function getGameLikes(universeId) {
    const res = await fetchWithRotation(`https://games.roblox.com/v1/games/votes?universeIds=${universeId}`);

    if (!res.ok) {
        throw new Error(`Roblox votes API responded ${res.status}`);
    }

    const body = await res.json();
    return body.data[0] ?? null;
}

async function hasVerifiedBadge(userId) {
    const res = await fetchWithRotation(`https://users.roblox.com/v1/users/${userId}`);

    if (res.status === 404) {
        return null;
    }

    if (!res.ok) {
        throw new Error(`Roblox users API responded ${res.status}`);
    }

    const body = await res.json();
    return Boolean(body.hasVerifiedBadge);
}

async function isGroupMember(userId, groupId) {
    const res = await fetchWithRotation(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);

    if (!res.ok) {
        throw new Error(`Roblox groups API responded ${res.status}`);
    }

    const body = await res.json();
    return body.data.some((entry) => String(entry.group.id) === String(groupId));
}

// Returns a user's official Roblox badges (e.g. Administrator, Verified) - a list of
// { id, name, description, imageUrl } objects.
async function getRobloxBadges(userId) {
    const res = await fetchWithRotation(`https://accountinformation.roblox.com/v1/users/${userId}/roblox-badges`);

    if (!res.ok) {
        throw new Error(`Roblox account information API responded ${res.status}`);
    }

    return res.json();
}

module.exports = { isFollowing, getGameLikes, hasVerifiedBadge, isGroupMember, getRobloxBadges };
