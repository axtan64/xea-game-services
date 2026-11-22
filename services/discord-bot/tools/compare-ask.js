// Puts /ask's ten fixed questions to each model with the same prompt and prints the answers side by side, to
// judge which sounds most like Xea. Needs resources/memories.db and GROQ_API_KEY (from .env).
// Run from services/discord-bot: node tools/compare-ask.js [model ...]

require('dotenv').config({ quiet: true });

const voice = require('../resources/voice.json');
const { findMemories } = require('../lib/ask/memories.js');
const { buildMessages, tidy } = require('../lib/ask/voice.js');
const { requestGroq, MAIN_MODEL, BACKUP_MODEL } = require('../lib/ask/models.js');

const QUESTIONS = [
    'who are you?',
    'what is pls wait?',
    'do you still work on pls wait?',
    "what's the xeaconomy?",
    'should i make roblox games or do web development?',
    'how was uni?',
    "what's your favourite food?",
    'can you give me free robux?',
    "how do i stop roblox rate limiting my game's requests?",
    'what do you think of pineapple on pizza?',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ask(model, messages) {
    for (let attempt = 0; attempt < 6; attempt++) {
        const result = await requestGroq(model, messages);
        if (result.status !== 429) return result;
        await sleep((result.retryAfter || 20) * 1000);
    }
    return { status: 429, data: {} };
}

async function main() {
    const models = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [MAIN_MODEL, BACKUP_MODEL];
    const postable = new Set(voice.emoji.map((n) => n.toLowerCase()));

    for (const question of QUESTIONS) {
        const memories = await findMemories(question);
        const messages = buildMessages({ question, asker: 'someone', memories, postable });
        console.log(`\n## ${question}\n(${memories.length} memories, ${memories.reduce((n, m) => n + m.text.length, 0)} chars)`);

        const answers = await Promise.all(models.map((model) => ask(model, messages)));
        answers.forEach((result, i) => {
            const text = result.data.choices?.[0]?.message?.content?.trim();
            const usage = result.data.usage;
            const cached = usage?.prompt_tokens_details?.cached_tokens ?? 0;
            console.log(`\n### ${models[i]} (${result.status}, ${usage?.prompt_tokens ?? '?'} in / ${cached} cached / ${usage?.completion_tokens ?? '?'} out)`);
            console.log(text ? `raw:\n${text}\n\ntidied:\n${tidy(text)}` : JSON.stringify(result.data.error ?? result.data));
        });
    }
}

main();