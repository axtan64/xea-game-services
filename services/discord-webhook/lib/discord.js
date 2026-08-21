async function sendWebhookEmbed(embed, content) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl)
        throw new Error('DISCORD_WEBHOOK_URL is not configured');

    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(content && { content }), embeds: [embed] }),
    });

    if (!res.ok)
        throw new Error(`Discord webhook responded ${res.status}`);
}

module.exports = { sendWebhookEmbed };
