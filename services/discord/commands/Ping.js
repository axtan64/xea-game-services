const { SlashCommandBuilder } = require('discord.js');
const Command = require('../model/Command.js');

/**
 * Reply to the user with 'pong'
 */
const ping = new Command(
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with pong and latency'),
    async (interaction) => {
        await interaction.reply({ content: 'Pinging...'}); // Reply with temp message
        const sent = await interaction.fetchReply(); // Fetch the reference to the message just sent by the bot

        const pingTime = sent.createdTimestamp - interaction.createdTimestamp; // How long between bot and user message?
        
        await interaction.editReply(`Pong! 🏓\nBot Latency: ${pingTime}ms\nAPI Latency: ${Math.round(interaction.client.ws.ping)}ms`);
    },
    5000
);

module.exports = ping;