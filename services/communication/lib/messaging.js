const UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_OPEN_CLOUD_API_KEY;

// Roblox caps MessagingService message payloads at 1024 bytes
const MAX_MESSAGE_BYTES = 1024;

const TOPIC = 'announcements';

// Publishes to Roblox's MessagingService via the Open Cloud API, rather than calling
// MessagingService:PublishAsync() from inside a live game server - this lets an announcement be
// triggered from anywhere (this API), not just from a running Roblox server.
async function publishMessage(topic, data) {
    const payload = JSON.stringify(data);

    if (Buffer.byteLength(payload, 'utf8') > MAX_MESSAGE_BYTES)
        throw new RangeError(`Message payload exceeds Roblox's ${MAX_MESSAGE_BYTES} byte limit`);

    const res = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${topic}`, {
        method: 'POST',
        headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: payload }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Roblox messaging-service responded ${res.status}: ${body}`);
    }
}

function publishAnnouncement(userId, message) {
    return publishMessage(TOPIC, { userId, message });
}

module.exports = { publishAnnouncement, MAX_MESSAGE_BYTES };
