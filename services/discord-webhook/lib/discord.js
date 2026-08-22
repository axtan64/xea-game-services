/**
 * Sends a discord embed for a webhook associated with a game
 * @param {String} webhookUrl The webhook URL associated with the game
 * @param {Object} embed The embed object to send
 * @param {String} [content] Optional content to send along with the embed
 * @returns {Promise<void>} A promise that resolves when the webhook is sent
 */
async function sendWebhookEmbed(webhookUrl, embed, content) {
    if (!webhookUrl)
        throw new Error('No Discord webhook URL configured for this game');

    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(content && { content }), embeds: [embed] }),
    });

    if (!res.ok)
        throw new Error(`Discord webhook responded ${res.status}`);
}

module.exports = { sendWebhookEmbed };
