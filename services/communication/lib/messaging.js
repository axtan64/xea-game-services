// Roblox limit = 1024 byes
const MAX_MESSAGE_BYTES = 1024;

const TOPIC = 'announcements';

/**
 * Publish a global message to all Roblox servers via Open Cloud API MessagingService
 * @param {String} universeId Id of the Roblox universe (provided from headers)
 * @param {String} apiKey API key for the Roblox universe (provided from headers)
 * @param {String} topic Topic to publish to (e.g. "announcements")
 * @param {Object} data Data to send in the message (will be JSON-encoded)
 */
async function publishMessage(universeId, apiKey, topic, data) {
    const payload = JSON.stringify(data);

    if (Buffer.byteLength(payload, 'utf8') > MAX_MESSAGE_BYTES)
        throw new RangeError(`Message payload exceeds Roblox's ${MAX_MESSAGE_BYTES} byte limit`);

    const res = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${universeId}/topics/${topic}`, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: payload }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Roblox messaging-service responded ${res.status}: ${body}`);
    }
}

function publishAnnouncement(universeId, apiKey, userId, message) {
    return publishMessage(universeId, apiKey, TOPIC, { userId, message });
}

// Must match Enums.GlobalMessage.ProductGranted exactly on the Roblox side
const PRODUCT_GRANTED_TOPIC = 'PRODUCT_GRANTED';

function publishProductGrant(universeId, apiKey, recipientUserId, productKey) {
    return publishMessage(universeId, apiKey, PRODUCT_GRANTED_TOPIC, { recipientUserId, productKey });
}

// Must match Topics.AccountChanged on the Roblox side: a live server re-reads the account's roles and ban, and kicks
// the player if banned or if kickReason is given
const ACCOUNT_CHANGED_TOPIC = 'ACCOUNT_CHANGED';

function publishAccountChanged(universeId, apiKey, userId, kickReason) {
    return publishMessage(universeId, apiKey, ACCOUNT_CHANGED_TOPIC, kickReason ? { userId, kickReason } : { userId });
}

// Must match Topics.SoftRestart on the Roblox side: every live server saves and moves its players on to a fresh
// server (a city to a new server of the same city, the lobby to a new lobby), so they pick up the latest version
const SOFT_RESTART_TOPIC = 'SOFT_RESTART';

function publishSoftRestart(universeId, apiKey, requestedBy) {
    return publishMessage(universeId, apiKey, SOFT_RESTART_TOPIC, requestedBy ? { requestedBy } : {});
}

module.exports = { publishAnnouncement, publishProductGrant, publishAccountChanged, publishSoftRestart, MAX_MESSAGE_BYTES };