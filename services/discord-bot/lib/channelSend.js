/**
 * Send a rich embed to a specific Discord channel via the already-logged-in bot client
 * @param {import('discord.js').Client} client
 * @param {string} channelId
 * @param {Object} embed
 * @param {string} [content] Optional plain-text content (e.g. an @role mention) alongside the embed
 */
async function sendChannelEmbed(client, channelId, embed, content) {
    const channel = await client.channels.fetch(channelId);

    if (!channel)
        throw new Error(`Channel ${channelId} not found or bot lacks access`);

    await channel.send({ ...(content && { content }), embeds: [embed] });
}

module.exports = { sendChannelEmbed };