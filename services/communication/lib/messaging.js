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

module.exports = { publishAnnouncement, MAX_MESSAGE_BYTES };
