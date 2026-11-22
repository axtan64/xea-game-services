// Custom emoji in /ask text

const EMOJI_TAG = /<(a?):(\w{2,32}):(\d+)>/g;

/**
 * @param {string} text
 * @returns {string} the text with every <:name:id> / <a:name:id> written as :name:
 */
function toShortcodes(text) {
    return text.replace(EMOJI_TAG, ':$2:');
}

/**
 * @param {Iterable<{ id: string, name: string, animated?: boolean, available?: boolean }>} emojis
 * @returns {Map<string, string>} lowercased name -> the string that posts it
 */
function emojiIndex(emojis) {
    const index = new Map();
    for (const emoji of emojis) {
        if (!emoji.name || emoji.available === false) continue;
        const key = emoji.name.toLowerCase();
        if (!index.has(key)) index.set(key, `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`);
    }
    return index;
}

/**
 * Every custom emoji the bot can post: those of the servers it's in.
 * @param {import('discord.js').Client} client
 */
function clientEmojiIndex(client) {
    return emojiIndex(client.emojis.cache.values());
}

/**
 * @param {string} text the model's reply
 * @param {Map<string, string>} index from emojiIndex
 * @returns {string} with :name: turned into postable emoji and unknown ones removed
 */
function renderEmoji(text, index) {
    return toShortcodes(text)
        .replace(/(?<!\w):([A-Za-z]\w{1,31}):(?!\w)/g, (match, name) => index.get(name.toLowerCase()) ?? '')
        .replace(/[ \t]{2,}/g, ' ')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');
}

module.exports = { toShortcodes, emojiIndex, clientEmojiIndex, renderEmoji };