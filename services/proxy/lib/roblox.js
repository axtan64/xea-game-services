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

/**
 * Returns a list of { id, name, description, imageUrl } objects, representing the user's badges
 */
async function getRobloxBadges(userId) {
    const res = await fetchWithRotation(`https://accountinformation.roblox.com/v1/users/${userId}/roblox-badges`);

    if (!res.ok) {
        throw new Error(`Roblox account information API responded ${res.status}`);
    }

    return res.json();
}

/**
 * Return all the public games of a particular user
 * @param {number} userId ID of the user
 * @returns {{ universeId: number, name: string }[]}
 */
async function getPublicGames(userId) {
    const games = [];
    let cursor = null;

    do {
        const url = new URL(`https://games.roblox.com/v2/users/${userId}/games`);
        url.searchParams.set('accessFilter', 'Public');
        url.searchParams.set('limit', '50');
        if (cursor) url.searchParams.set('cursor', cursor);

        const res = await fetchWithRotation(url.toString());

        if (!res.ok)
            throw new Error(`Roblox games API responded ${res.status}`);

        const body = await res.json();

        for (const game of body.data)
            games.push({ universeId: game.id, name: game.name });

        cursor = body.nextPageCursor;
    } while (cursor);

    return games;
}

/**
 * Given a universe, retrieve its gamepasses (up to 100)
 * @param {number} universeId ID of the universe
 * @param {string} gameName Name of the game
 * @return {{ id, name, price, universeId, gameName }[]} List of gamepasses 
 */
async function getGamepasses(universeId, gameName) {
    const url = new URL(`https://games.roblox.com/v1/games/${universeId}/game-passes`);
    url.searchParams.set('limit', String(100));
    url.searchParams.set('sortOrder', 'Asc');

    const res = await fetchWithRotation(url.toString());

    if (!res.ok)
        throw new Error(`Roblox game-passes API responded ${res.status}`);

    const body = await res.json();

    return body.data
        .filter((pass) => typeof pass.price === 'number' && pass.price > 0)
        .map((pass) => ({
            id: pass.id,
            name: pass.name,
            price: pass.price,
            universeId,
            gameName,
        }));
}

/**
 * Call a function up to *concurrency* times simultaneously, for each parameter supplied in the items list
 * @param {any[]} items List of parameters. fn is called once for each item
 * @param {number} concurrency Maximum number of concurrent workers
 * @param {function} fn Function to call concurrently
 * @return {any[]} Results from calling fn for each parameter (in order)
 */
async function mapWithConcurrency(items, concurrency, fn) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const current = index++;
            results[current] = await fn(items[current], current);
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));

    return results;
}

/**
 * Get all the publicly available gamepasses for a particular user
 * @param {number} userId ID of the user 
 */
async function getAllGamepasses(userId) {
    const games = await getPublicGames(userId);

    // "get gamepasses for each game"
    const perGame = await mapWithConcurrency(games, 8, async (game) => {
        try {
            return await getGamepasses(game.universeId, game.name);
        } catch (err) {
            console.error(`Failed to fetch gamepasses for universe ${game.universeId}:`, err);
            return [];
        }
    });

    // return a flat list of gamepasses, combined from all games
    return perGame.flat();
}

module.exports = {
    isFollowing,
    getGameLikes,
    hasVerifiedBadge,
    isGroupMember,
    getRobloxBadges,
    getPublicGames,
    getGamepasses,
    getAllGamepasses,
};
