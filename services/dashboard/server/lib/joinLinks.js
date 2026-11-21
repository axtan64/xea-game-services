// Links that start Roblox in a game with launch data its first server reads (Player:GetJoinData().LaunchData), for
// the dashboard's Join buttons. Each goes to the game's start place, which for Clean Up The City is its lobby (a
// city is a reserved server, which no link can open), and the lobby sends the player on:
// - { city: { o, s } } names a city, owner ID and slot: the game's own invite format (its Services/Lobby/Invites,
//   read by Systems/Lobby/InviteArrivals), judged by the backend as an invite is (api/slots.js `judge`)
// - { follow } names a player to join wherever they are, for staff, as the game's /join command does
// Nothing secret goes in a link: never a reserved server's access code

// The start place rarely changes; Roblox is asked again after this long
const PLACE_TTL_MS = 60 * 60 * 1000;
// Roblox reads at most 200 bytes of launch data
const MAX_LAUNCH_DATA = 200;

const startPlaces = new Map(); // universeId -> { at, placeId }

// The start (root) place of a universe, from Roblox's public games API, or null if Roblox doesn't say
async function getStartPlaceId(universeId) {
    const cached = startPlaces.get(universeId);
    if (cached && Date.now() - cached.at < PLACE_TTL_MS) return cached.placeId;

    try {
        const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
        const placeId = res.ok ? (await res.json())?.data?.[0]?.rootPlaceId : null;
        if (!placeId) return cached?.placeId ?? null;

        startPlaces.set(universeId, { at: Date.now(), placeId: String(placeId) });
        return String(placeId);
    } catch (err) {
        console.error(`Couldn't read universe ${universeId}'s start place:`, err);
        return cached?.placeId ?? null;
    }
}

function startUrl(placeId, launchData) {
    const data = JSON.stringify(launchData);
    if (Buffer.byteLength(data) > MAX_LAUNCH_DATA) return null;
    return `https://www.roblox.com/games/start?placeId=${placeId}&launchData=${encodeURIComponent(data)}`;
}

// The links for a game, or null when it has no universe ID or Roblox won't say its start place: { city(ownerId,
// slot), follow(userId) }, each a URL
async function forGame(game) {
    if (game.robloxUniverseId == null) return null;

    const placeId = await getStartPlaceId(String(game.robloxUniverseId));
    if (!placeId) return null;

    return {
        city: (ownerId, slot) => startUrl(placeId, { city: { o: Number(ownerId), s: slot } }),
        follow: (userId) => startUrl(placeId, { follow: Number(userId) }),
    };
}

module.exports = { forGame };
