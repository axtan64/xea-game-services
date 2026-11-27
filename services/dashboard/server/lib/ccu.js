// How many players are in each game at once (CCU)
const { Game } = require('database');

// Roblox refreshes `playing` about once a minute, so asking more often finds nothing new
const POLL_MS = 60 * 1000;
// Roblox takes this many universe IDs in one request
const BATCH = 50;
// A read that hangs this long is given up, so reads never pile up
const TIMEOUT_MS = 10 * 1000;
// The Discord bot, which posts each new peak to its milestones channel (services/discord-bot/api/playerPeak.js)
const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL;

const latest = new Map(); // game id -> { universeId, playing, at }

// The first poll after a start only stores a peak; later ones announce one too
let hasPolled = false;

// universe ID -> { playing, placeId }
async function readPlaying(universeIds) {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Roblox's games API answered ${res.status}`);

    const counts = new Map();
    for (const entry of (await res.json())?.data ?? []) {
        if (Number.isInteger(entry.playing) && entry.playing >= 0)
            counts.set(String(entry.id), { playing: entry.playing, placeId: entry.rootPlaceId ?? null });
    }
    return counts;
}

// The game's page on roblox.com, named as the dashboard names it: "Clean Up The City" is .../Clean-Up-The-City
function gamePageUrl(placeId, name) {
    const words = name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `https://www.roblox.com/games/${placeId}${words ? `/${words}` : ''}`;
}

// What the bot is sent for a new peak: the game's name from its row, never its slug
function describePeak(game, players, previous, placeId) {
    return { name: game.name, players, previous, url: gamePageUrl(placeId, game.name) };
}

// Asks the bot to post a new peak. A failure is only logged: the peak is stored either way
async function announcePeak(peak) {
    if (!DISCORD_BOT_URL) return;

    try {
        const res = await fetch(`${DISCORD_BOT_URL}/player-peak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(peak),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) console.error(`[ccu] The Discord bot refused ${peak.name}'s new peak (${res.status}):`, await res.text());
    } catch (err) {
        console.error(`[ccu] The Discord bot couldn't be reached for ${peak.name}'s new peak:`, err);
    }
}

async function poll() {
    const games = (await Game.findAll()).filter((game) => game.robloxUniverseId != null);

    for (let start = 0; start < games.length; start += BATCH) {
        const batch = games.slice(start, start + BATCH);
        const at = new Date();
        const counts = await readPlaying(batch.map((game) => String(game.robloxUniverseId)));

        for (const game of batch) {
            const universeId = String(game.robloxUniverseId);
            const read = counts.get(universeId);
            if (!read) continue;

            latest.set(game.id, { universeId, playing: read.playing, at });

            // The dashboard is the only writer, so the peak read above is the one this beats
            const previous = game.peakCcu;
            if (!(await Game.raisePeakCcu(game.id, read.playing, at))) continue;

            console.log(`[ccu] ${game.slug} reached a new peak of ${read.playing} players (was ${previous})`);
            // Not the first poll after a start, nor the first count ever stored (0, just after the migration)
            if (hasPolled && previous > 0 && read.placeId)
                announcePeak(describePeak(game, read.playing, previous, read.placeId));
        }
    }

    hasPolled = true;
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

module.exports = { POLL_MS, startCcuPolling, getCcuNow, describePeak };
