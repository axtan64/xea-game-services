const { SlashCommandBuilder } = require('discord.js');
const Command = require('../model/Command.js');
const { getGroupFunds, getGroupIconUrl, RobloxAuthError } = require('../lib/robloxGroup.js');
const { getRobloxBotCookie } = require('../lib/credentials.js');
const { buildFundsEmbed } = require('../lib/embeds.js');

/**
 * Reply with the group's current Robux funds (pending + total, with USD equivalents)
 */
const funds = new Command(
    new SlashCommandBuilder()
        .setName('funds')
        .setDescription("Shows the group's current Robux funds"),
    async (interaction) => {
        await interaction.deferReply();

        try {
            const groupId = process.env.ROBLOX_GROUP_ID;
            const cookie = await getRobloxBotCookie();

            const [data, iconUrl] = await Promise.all([
                getGroupFunds(groupId, cookie),
                getGroupIconUrl(groupId, cookie),
            ]);

            await interaction.editReply({ embeds: [buildFundsEmbed({ ...data, iconUrl })] });
        } catch (err) {
            console.error('Error fetching group funds:', err);

            const message = err instanceof RobloxAuthError
                ? '⚠️ The Roblox bot cookie appears to be stale/expired - it needs to be rotated.'
                : 'Failed to fetch group funds. Try again later.';

            await interaction.editReply({ content: message });
        }
    },
    10000
);

module.exports = funds;