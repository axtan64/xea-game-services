const { SlashCommandBuilder } = require('discord.js');
const Command = require('../model/Command.js');

const { findMemories } = require('../lib/ask/memories.js');
const { buildMessages, tidy } = require('../lib/ask/voice.js');
const { complete, BusyError } = require('../lib/ask/models.js');
const { clientEmojiIndex, renderEmoji } = require('../lib/ask/emojiText.js');

const MAX_QUESTION = 300;
const MAX_MESSAGE = 2000;   // Discord's limit
const NO_PINGS = { parse: [] };

/**
 * Splits text into Discord-sized messages at line breaks, else spaces, never inside an emoji's <:name:id>.
 * @param {string} text
 * @returns {string[]}
 */
function splitMessages(text) {
    const parts = [];
    let rest = text;
    while (rest.length > MAX_MESSAGE) {
        let cut = rest.lastIndexOf('\n', MAX_MESSAGE);
        if (cut < MAX_MESSAGE / 2) cut = rest.lastIndexOf(' ', MAX_MESSAGE);
        if (cut < MAX_MESSAGE / 2) {
            const open = rest.lastIndexOf('<', MAX_MESSAGE);
            cut = open > rest.lastIndexOf('>', MAX_MESSAGE) && open > 0 ? open : MAX_MESSAGE;
        }
        parts.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
    }
    if (rest) parts.push(rest);
    return parts;
}

async function send(interaction, question, answer) {
    const [first, ...more] = splitMessages(`**Question:** ${question}\n\n**Answer:** ${answer}`);
    await interaction.editReply({ content: first, allowedMentions: NO_PINGS });
    for (const content of more) await interaction.followUp({ content, allowedMentions: NO_PINGS });
}

/**
 * Given a question, the bot answers as Xea: his memories closest to the question, his voice from
 * resources/voice.json, and a free chat model (lib/ask/models.js).
 */
const ask = new Command(
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the bot a question and it will answer based on its memory.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question you want to ask the bot.')
                .setRequired(true)
                .setMaxLength(MAX_QUESTION)
        ),
    async (interaction) => {
        const question = interaction.options.getString('question');

        await interaction.reply({ content: 'uhhh lemme have a think about that one (loading...)', allowedMentions: NO_PINGS });

        // Interaction already replied to here, so use editReply to indicate failure (not reply/replyError)
        try {
            const emoji = clientEmojiIndex(interaction.client);
            const memories = await findMemories(question);
            const messages = buildMessages({
                question,
                asker: interaction.member?.displayName ?? interaction.user.displayName,
                memories,
                postable: new Set(emoji.keys()),
            });

            const reply = await complete(messages);
            const answer = renderEmoji(tidy(reply.text), emoji) || 'uhhh';

            await send(interaction, question, answer);
        } catch (error) {
            if (error instanceof BusyError) {
                await send(interaction, question, "too many people asking me stuff rn 😭\ntry again in a minute or two").catch(() => {});
                return;
            }

            console.error('Error generating response:', error);

            await interaction.editReply('sorry i died while trying to answer your question. please try again later.').catch(() => {});
        }
    },
    5000
);

module.exports = ask;
