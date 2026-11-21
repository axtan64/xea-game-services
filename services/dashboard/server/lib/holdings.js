// What a player holds that the backend keeps, and taking it away: passes given through ownedProducts (gifts and
// grants), explosives in stock, and what a logged purchase gave. Robux are never refunded from here, and nothing
// Roblox itself keeps (a game pass bought on Roblox) can be touched

// A live server saves its players' stats every minute (Clean Up The City's AUTOSAVE_INTERVAL), writing back what it
// holds of them: stats saved this recently are taken to be held by a server, which would undo a change to its own
// saved stats (explosives). ownedProducts is never written back by the game, so it may change at any time
const PLAYING_WITHIN_MS = 3 * 60 * 1000;

// The most of an explosive one take may remove
const MOST_TAKEN = 1000000;

// Whether a live server is probably holding the player's stats, from when they were last saved
function isPlaying(stats) {
    if (!stats?.updatedAt) return false;
    return Date.now() - new Date(stats.updatedAt).getTime() < PLAYING_WITHIN_MS;
}

const PLAYING_ERROR = 'They are playing, or were in the last few minutes: their server saves their explosives every '
    + 'minute and would put them back. Try again once they have been gone a few minutes.';

const isCount = (value) => Number.isInteger(value) && value > 0 && value <= MOST_TAKEN;

// What a logged purchase gave, read from how the game (Clean Up The City's Receipts) and the dashboard log them:
// - pass: a gift (metadata.gift, the Gift product's key, `Gift<pass key>`) or the dashboard's grant
//   (metadata.source 'dashboard'), which the backend merged into the recipient's ownedProducts
// - explosive: `count` of an explosive into the buyer's stock (metadata.explosive)
// - cash, boost: money or a cash boost for a city, which the city keeps
// - robloxPass: a game pass bought on Roblox, which Roblox keeps; the record is only a record
// `undoable` says whether deleting the record can also take back what it gave
function describeEffect(purchase) {
    const meta = purchase.metadata && typeof purchase.metadata === 'object' ? purchase.metadata : {};

    if (typeof meta.gift === 'string' && /^Gift\w+$/.test(meta.gift))
        return { kind: 'pass', passKey: meta.gift.slice('Gift'.length), undoable: true };
    if (meta.source === 'dashboard' && typeof meta.productKey === 'string')
        return { kind: 'pass', passKey: meta.productKey, undoable: true };
    if (typeof meta.explosive === 'string' && isCount(meta.count))
        return { kind: 'explosive', explosive: meta.explosive, count: meta.count, undoable: true };
    if (meta.boost !== undefined) return { kind: 'boost', undoable: false };
    if (meta.donation !== undefined) return { kind: 'cash', undoable: false };
    if (purchase.productType === 'gamepass') return { kind: 'robloxPass', undoable: false };
    return { kind: 'other', undoable: false };
}

// Takes a pass out of a player's ownedProducts. Resolves to whether they had it
async function takePass(Model, userId, key) {
    const stats = await Model.get(userId);
    const owned = { ...(stats?.ownedProducts ?? {}) };
    if (!Object.hasOwn(owned, key) || !owned[key]) return false;

    delete owned[key];
    await Model.updateQuietly(userId, { ownedProducts: owned });
    return true;
}

// Takes up to `count` of an explosive (all of it if count is null) from a player's stock. Resolves to how many went
async function takeExplosives(Model, userId, explosive, count = null) {
    const stats = await Model.get(userId);
    const stock = { ...(stats?.explosives ?? {}) };
    const held = Object.hasOwn(stock, explosive) && Number.isInteger(stock[explosive]) ? stock[explosive] : 0;
    const taken = count === null ? held : Math.min(held, count);
    if (taken <= 0) return 0;

    if (held - taken > 0) stock[explosive] = held - taken;
    else delete stock[explosive];
    await Model.updateQuietly(userId, { explosives: stock });
    return taken;
}

// A player's explosives for their page: each the game sells, then any other id in their stock
function describeStock(known, stock) {
    const held = stock && typeof stock === 'object' ? stock : {};
    const count = (key) => (Object.hasOwn(held, key) && Number.isInteger(held[key]) ? held[key] : 0);
    const others = Object.keys(held).filter((key) => count(key) > 0 && !known.some((explosive) => explosive.key === key));

    return [
        ...known.map((explosive) => ({ ...explosive, count: count(explosive.key) })),
        ...others.map((key) => ({ key, name: key, count: count(key) })),
    ];
}

module.exports = { MOST_TAKEN, PLAYING_ERROR, isCount, isPlaying, describeEffect, describeStock, takePass, takeExplosives };
