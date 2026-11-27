// How many players are in each game at once (CCU)
const { Game } = require('database');

// Roblox refreshes `playing` about once a minute, so asking more often finds nothing new
const POLL_MS = 60 * 1000;
// Roblox takes this many universe IDs in one request
const BATCH = 50;
// A read that hangs this long is given up, so reads never pile up
const TIMEOUT_MS = 10 * 1000;

const latest = new Map(); // game id -> { universeId, playing, at }

async function readPlaying(universeIds) {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Roblox's games API answered ${res.status}`);

    const counts = new Map(); // universe ID -> playing
    for (const entry of (await res.json())?.data ?? []) {
        if (Number.isInteger(entry.playing) && entry.playing >= 0) counts.set(String(entry.id), entry.playing);
    }
    return counts;
}

async function poll() {
    const games = (await Game.findAll()).filter((game) => game.robloxUniverseId != null);

    for (let start = 0; start < games.length; start += BATCH) {
        const batch = games.slice(start, start + BATCH);
        const at = new Date();
        const counts = await readPlaying(batch.map((game) => String(game.robloxUniverseId)));

        for (const game of batch) {
            const universeId = String(game.robloxUniverseId);
            const playing = counts.get(universeId);
            if (playing === undefined) continue;

            latest.set(game.id, { universeId, playing, at });
            if (await Game.raisePeakCcu(game.id, playing, at))
                console.log(`[ccu] ${game.slug} reached a new peak of ${playing} players`);
        }
    }
}

// Reads every game's CCU now and every POLL_MS after. A failed read is logged and tried again next time
function startCcuPolling() {
    const run = () => poll().catch((err) => console.error('[ccu] Reading the games\' player counts failed:', err));
    run();
    setInterval(run, POLL_MS);
}

// The last count read for a game: { playing, at }, or null before the first read of its universe ID (or with none)
function getCcuNow(game) {
    const entry = latest.get(game.id);
    if (!entry || game.robloxUniverseId == null || entry.universeId !== String(game.robloxUniverseId)) return null;
    return { playing: entry.playing, at: entry.at };
}

module.exports = { POLL_MS, startCcuPolling, getCcuNow };