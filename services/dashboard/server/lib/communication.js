// Publishes cross-server messages through the communication service, as the gateway does for a game server: with
// the game's own universe ID and Open Cloud key from its Game row. The topics and their limits stay in one place
// (services/communication/lib/messaging.js), where the games subscribe to them
const BASE_URL = process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3001';

class PublishError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

function isMessagingReady(game) {
    return game.robloxUniverseId != null && Boolean(game.robloxOpenCloudApiKey);
}

async function publish(game, path, body) {
    if (!isMessagingReady(game))
        throw new PublishError(`${game.name} has no universe ID or Open Cloud key yet: set them on the Games page`, 400);

    let res;
    try {
        res = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-roblox-universe-id': String(game.robloxUniverseId),
                'x-roblox-open-cloud-api-key': game.robloxOpenCloudApiKey,
            },
            body: JSON.stringify(body),
        });
    } catch (err) {
        console.error('Communication service unreachable:', err);
        throw new PublishError('The communication service could not be reached');
    }

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.detail ? `${data.error}: ${data.detail}` : data.error;
        throw new PublishError(message || `The communication service answered ${res.status}`, res.status);
    }
}

// Shows an announcement in every live server; userId 0 is from the developers as a whole
const announce = (game, userId, message) => publish(game, '/announce', { userId: String(userId), message });

// Tells every live server a player now owns a product, so the server they're in gives it to them at once
const productGranted = (game, recipientUserId, productKey) =>
    publish(game, '/product-grant', { recipientUserId: String(recipientUserId), productKey });

// Tells every live server a player's account changed: the one they're in re-reads their roles, or kicks
// them with `kickReason`
const accountChanged = (game, userId, kickReason) =>
    publish(game, '/account-changed', { userId: String(userId), ...(kickReason && { kickReason }) });

// Tells live servers to soft restart: each saves and moves its players on to a fresh server. Every server, or with
// `targets` ({ jobIds?, lobbies? }) only the servers with those JobIds and, with `lobbies`, every lobby
const softRestart = (game, requestedBy, targets = {}) =>
    publish(game, '/soft-restart', { requestedBy: String(requestedBy), ...targets });

// Runs a publish after a change already saved, answering how it went rather than throwing: the change stands
// either way, and live servers only learn of it sooner
async function tellLiveServers(send) {
    try {
        await send();
        return { told: true };
    } catch (err) {
        return { told: false, toldError: err.message };
    }
}

module.exports = { PublishError, isMessagingReady, announce, productGranted, accountChanged, softRestart, tellLiveServers };