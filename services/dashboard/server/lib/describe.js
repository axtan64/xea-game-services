const { LIVE_WITHIN_MS } = require('./games');
const { describeEffect } = require('./holdings');

const NO_PROFILE = (userId) => ({ userId, name: null, username: null, picture: null });

// Whether a ban still holds: it has no end, or its end hasn't come
function isBanActive(membership) {
    if (!membership?.bannedAt) return false;
    return !membership.banExpiresAt || membership.banExpiresAt > new Date();
}

// A player's standing in a game, for the dashboard; a player with no membership row has none of it
function describeMembership(membership) {
    return {
        isAdmin: Boolean(membership?.isAdmin),
        isBanned: isBanActive(membership),
        bannedAt: membership?.bannedAt ?? null,
        banReason: membership?.banReason ?? null,
        banExpiresAt: membership?.banExpiresAt ?? null,
    };
}

// What the dashboard shows of a save slot: its summary and whether it is being played, never its lock ID or the
// access code of its reserved server
function describeSlot(slot) {
    const lockedAt = slot.lockedAt ? new Date(slot.lockedAt) : null;

    return {
        ownerId: String(slot.ownerId),
        slot: slot.slot,
        cleanShare: slot.cleanShare,
        cash: slot.cash,
        partySize: slot.partySize,
        playTime: slot.playTime,
        finishedIn: slot.finishedIn,
        lastPlayedAt: slot.lastPlayedAt,
        playerCount: slot.playerCount,
        maxPlayers: slot.maxPlayers,
        ownerPresent: slot.ownerPresent,
        isLive: slot.lockId != null && lockedAt != null && Date.now() - lockedAt.getTime() < LIVE_WITHIN_MS,
        lockedAt,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
    };
}

// The user IDs a page of purchases names, for one profile lookup
function purchasePeople(purchases) {
    return purchases.flatMap((purchase) => [purchase.user?.robloxId, purchase.recipient?.robloxId]).filter((id) => id != null).map(String);
}

// A purchase for the log: who bought it and, if someone else, for whom, and what it gave (lib/holdings). One with
// no receipt and no price was given, by an admin's command, the game's owner or the dashboard
function describePurchase(purchase, people) {
    const buyerId = purchase.user ? String(purchase.user.robloxId) : null;
    const recipientId = purchase.recipient ? String(purchase.recipient.robloxId) : buyerId;

    return {
        id: purchase.id,
        at: purchase.purchasedAt,
        game: purchase.game?.slug ?? null,
        productId: String(purchase.productId),
        productType: purchase.productType,
        productKey: purchase.metadata?.productKey ?? purchase.metadata?.gift
            ?? (purchase.metadata?.explosive ? `${purchase.metadata.explosive} x${purchase.metadata.count}` : null),
        priceRobux: purchase.priceRobux,
        isGrant: purchase.robloxReceiptId == null && purchase.priceRobux === 0,
        gave: describeEffect(purchase),
        buyer: buyerId ? people[buyerId] ?? NO_PROFILE(buyerId) : null,
        recipient: recipientId && recipientId !== buyerId ? people[recipientId] ?? NO_PROFILE(recipientId) : null,
        metadata: purchase.metadata ?? null,
    };
}

module.exports = { NO_PROFILE, isBanActive, describeMembership, describeSlot, purchasePeople, describePurchase };