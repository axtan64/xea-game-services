const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const Command = require('../model/Command.js');

const path = require("path");
const { pipeline } = require("@xenova/transformers");
const Database = require("better-sqlite3");
const sqliteVec = require("sqlite-vec");
const OpenAI = require("openai");

// Setup OpenAI client
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a Discord bot aimed at answering questions based on its memory. You are an AI replica of a human called 'Xea', a British ROBLOX game developer, owner of PLS WAIT, who is also the creator of this bot, and you are aiming to replicate him as closely as possible. Try to keep your answer concise.

You have access to the following memories, which are chunks of text from Discord messages. These are provided as context to the user's question, and so that you can phrase your answer in a way that is consistent with Xea's personality, grammar, capitalisation, sentence structure, and style of speaking. You should answer the user's question based on these memories. If there are none, just freestyle it.`;

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Setup GROQ client
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Setup database client
const PIPELINE = "feature-extraction";
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

const db = new Database(path.resolve(__dirname, "../resources/memories.db"));

sqliteVec.load(db);

function getUserPrompt(question, memories) {
    let userPrompt = "";

    userPrompt += `\n\nUser's question: ${question}\n\n`;

    userPrompt += `\n\nRelevant memories:\n`;

    // Add up to 1,000 characters of memories to the prompt
    let totalLength = 0;

    for (const { text } of memories) {
        const memoryText = `\n\nMemory: ${text}`;

        if (totalLength + memoryText.length > 1000) break;

        userPrompt += memoryText;

        totalLength += memoryText.length;
    }

    userPrompt += `\n\nYour answer:`;

    return userPrompt;
}

/**
 * Given a question, the bot will search its memory for relevant information and provide an answer.
 */
const ask = new Command(
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the bot a question and it will answer based on its memory.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question you want to ask the bot.')
                .setRequired(true)
        ),
    async (interaction) => {
        await interaction.reply({ content: 'uhhh lemme have a think about that one (loading...)' });
        const sent = await interaction.fetchReply(); // Fetch the reference to the message just sent by the bot

        const question = interaction.options.getString('question');

        // Load the transformer model for feature extraction
        const extractor = await pipeline(PIPELINE, MODEL_NAME);

        // Embed the question
        const questionEmbedding = await extractor(
            question,
            { pooling: "mean", normalize: true }
        );

        const questionVector = new Float32Array(questionEmbedding.data);

        // Search the database for relevant memories
        const results = db.prepare(`
            SELECT m.*, e.embedding
            FROM memory_embeddings e
            JOIN memories m
            ON m.id = e.rowid
            WHERE e.embedding MATCH ? AND k = 5
            ORDER BY e.distance
        `).all(questionVector);

        // Construct a response based on the retrieved memories
        let memories = results.map(result => result.text);

        const prompt = getUserPrompt(question, results);

        // Generate a response using OpenAI's API
        try {
            const groqResponse = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 200,
                }),
            });

            const groqData = await groqResponse.json();

            const answer = groqData.choices[0].message.content.trim();

            const response = `**Question:** ${question}\n\n**Answer:** ${answer}`;

            await interaction.editReply(response);
        } catch (error) {
            console.error('Error generating response:', error);

            await interaction.editReply('sorry i died while trying to answer your question. please try again later.');
        }
    },
    20000
);

module.exports = ask;