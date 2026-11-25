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

// Must match Topics.SoftRestart on the Roblox side: a live server saves and moves its players on to a fresh server
// (a city to a new server of the same city, the lobby to a new lobby), so they pick up the latest version. A message
// naming no server is for every server; otherwise for the servers whose JobId is in `jobIds`, and with `lobbies`
// for every lobby (Clean Up The City's Model/Shutdown/RestartOrder)
const SOFT_RESTART_TOPIC = 'SOFT_RESTART';

// The most JobIds one message names: each is 36 characters, 39 quoted with its comma, so 20 with requestedBy and
// lobbies come to about 850 bytes, inside Roblox's 1 KB
const JOB_IDS_PER_MESSAGE = 20;

// The messages a soft restart takes: one for every server, or the named servers 20 to a message, the lobbies
// named in the first
function softRestartMessages({ requestedBy, jobIds, lobbies } = {}) {
    const base = requestedBy ? { requestedBy } : {};
    if (!jobIds?.length && !lobbies) return [base];

    const messages = [];
    for (let i = 0; i < (jobIds?.length ?? 0); i += JOB_IDS_PER_MESSAGE)
        messages.push({ ...base, jobIds: jobIds.slice(i, i + JOB_IDS_PER_MESSAGE) });
    if (lobbies) {
        if (messages.length === 0) messages.push({ ...base });
        messages[0].lobbies = true;
    }
    return messages;
}

/**
 * @param {{ requestedBy?: string, jobIds?: string[], lobbies?: boolean }} order Who asked, and which servers: none
 *     named means every server
 * @throws If a publish fails; the messages before it were sent, and the error says how many
 */
async function publishSoftRestart(universeId, apiKey, order) {
    const messages = softRestartMessages(order);
    for (const [index, message] of messages.entries()) {
        try {
            await publishMessage(universeId, apiKey, SOFT_RESTART_TOPIC, message);
        } catch (err) {
            if (index > 0) err.message = `${err.message} (${index} of ${messages.length} messages were sent first)`;
            throw err;
        }
    }
}

// Must match Topics.GlobalEvent on the Roblox side
const GLOBAL_EVENT_TOPIC = 'GLOBAL_EVENT';

function publishGlobalEvent(universeId, apiKey, event) {
    return publishMessage(universeId, apiKey, GLOBAL_EVENT_TOPIC, event);
}

module.exports = {
    publishAnnouncement,
    publishProductGrant,
    publishAccountChanged,
    publishSoftRestart,
    publishGlobalEvent,
    softRestartMessages,
    MAX_MESSAGE_BYTES,
};