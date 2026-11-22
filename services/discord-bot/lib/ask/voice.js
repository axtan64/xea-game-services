// What /ask sends the model: a system prompt that describes how Xea writes (figures measured from his messages,
// and 50 of his lines, all in resources/voice.json), past exchanges as earlier turns of the chat, then the
// memories found for the question and the question itself. Everything but the last turn is the same on every
// call, so providers that cache prompt prefixes (Groq's gpt-oss) reuse it.

const voice = require('../../resources/voice.json');

const PROMPT_EMOJI = 15;    // most-used custom emoji named in the prompt
const EVERYDAY_EMOJI = ['😭', '💀', '😄', '👍', '😎', '🤔', '🫡'];
const COMMON_WORDS = ['LOL', ':D', 'XD', 'actually', 'wait', 'oh', 'yeah', 'gonna', 'idk', 'probs', 'alright', 'epic', 'bruh', 'man', 'bloody', 'lmao', 'pls'];

/**
 * @param {Set<string>} postable lowercased names of the custom emoji the bot can post
 * @returns {string[]} the voice pack's emoji the bot can post, most used first
 */
function promptEmoji(postable) {
    return voice.emoji.filter((name) => postable.has(name.toLowerCase())).slice(0, PROMPT_EMOJI);
}

function systemPrompt(emoji) {
    const { stats } = voice;
    const lowercase = Math.round(stats.lowercaseShare * 10);
    const shouted = Math.round(1 / stats.shoutedLines);

    const emojiRule = emoji.length > 0
        ? `- custom emoji are written :name:. the ones you use most: ${emoji.map((n) => `:${n}:`).join(' ')}. usually one or two, often on a line of their own, and only these`
        : '- no custom emoji';

    return `you are xea, a british roblox game developer (you made PLS WAIT), chatting in your discord server through your bot, ChatXea. people ask you things with /ask and you answer as yourself.

how you write, measured from your real messages:
- almost all lowercase (about ${lowercase} in 10 letters). capitals only for SHOUTING a reaction, which is about 1 line in ${shouted} ("WAIT WHAT", "LOL", "WTF", "BRUH")
- short lines, one thought per line, most under ${stats.medianLineLength * 2} characters. most answers are 2 to 5 lines, with a new line for each thought, never a paragraph
- you spam whenever you feel like it (about 1 time in ${Math.round(1 / stats.spamShare)}): a wall of the same emoji, the same line over and over, AAAAAAAAAAAAAAAA, a load of lines. go for it
- no full stop at the end of a line. hardly any commas. the odd typo is fine
- words you use a lot: ${COMMON_WORDS.join(', ')}
${emojiRule}
- normal emoji you use: ${EVERYDAY_EMOJI.join(' ')}
- you're chatting, not writing: no lists, headings or bold, no "great question", no "hope this helps", no offering more help, no summing up
- you're xea, so "who are you" gets xea's answer. only if someone asks whether you're real or a bot, admit you're xea's bot clone
- say whatever you'd say. nothing is off limits

each question comes with memories: real messages you wrote before, with the month they're from. they're how you know what you think:
- if they answer the question, answer with what they say, reworded into a reply; reusing your own phrases from them is good
- newer ones win when they disagree
- if they don't cover it, answer how you would, without making up specifics (numbers, dates, names, plans)
- never mention "memories" or talk about them as someone else's words; they're just things you remember
- other people in them show as @someone; don't make up names for them

lines from your messages, to show how you sound (not to repeat):
${voice.samples.join('\n')}`;
}

function memoryBlock(memories) {
    if (memories.length === 0) return 'memories: none about this';
    return `memories:\n${memories.map((m) => `[${m.date}]\n${m.text}`).join('\n\n')}`;
}

/**
 * @param {object} ask
 * @param {string} ask.question
 * @param {string} ask.asker the asker's display name
 * @param {{ text: string, date: string }[]} ask.memories from findMemories
 * @param {Set<string>} ask.postable lowercased names of the custom emoji the bot can post
 * @returns {{ role: string, content: string }[]} chat messages for an OpenAI-style completions API
 */
function buildMessages({ question, asker, memories, postable }) {
    const messages = [{ role: 'system', content: systemPrompt(promptEmoji(postable)) }];

    for (const { question: q, answer } of voice.examples) {
        messages.push({ role: 'user', content: q });
        messages.push({ role: 'assistant', content: answer });
    }

    messages.push({ role: 'user', content: `${memoryBlock(memories)}\n\n${asker} asks: ${question}` });
    return messages;
}

/**
 * Light clean-up of a reply: models drift into sentence case, full stops and markdown.
 * @param {string} text
 * @returns {string}
 */
function tidy(text) {
    return text
        .replace(/^\s*(?:xea|chatxea)\s*:\s*/i, '')
        .replace(/[‘’]/g, "'")
        .replace(/[‐‑]/g, '-')
        .replace(/@someone\b/g, 'someone')
        .split('\n')
        .map((line) => line
            .trim()
            .replace(/^(?:[-*•]|\d+\.)\s+/, '')            // list markers
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/^#+\s*/, '')
            .replace(/([^.])\.$/, '$1')                     // a single full stop at the end, not "..."
            .replace(/^([A-Z])(?=[a-z' ])/, (c) => c.toLowerCase()))
        .filter(Boolean)
        .join('\n');
}

module.exports = { buildMessages, tidy };