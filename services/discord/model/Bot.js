const { Client, GatewayIntentBits, Partials, REST, Routes, Collection, Events, PresenceUpdateStatus, MessageFlags, AttachmentBuilder } = require('discord.js');
const CommandLog = require('./CommandLog.js');

module.exports = class Bot {
    constructor(token) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.User,
                Partials.GuildMember
            ]
        });

        this.token = token;
        this.commands = new Collection();
        this.rest = new REST().setToken(token);
        this.status = PresenceUpdateStatus.Online;
        this.logs = new CommandLog();
    }

    async login() {
        try {
            await this.client.login(this.token);
            console.log('Discord bot logged in.');
        } catch (error) {
            console.error('Error logging in to Discord:', error);
            throw error;
        }
    }

    registerCommands(...commands) {
        for (const command of commands)
            this.commands.set(command.getData().name, command);
    }

    async deployCommands(clientId, guildId) {
        const commands = Array.from(this.commands.values()).map(command => command.getData().toJSON());

        const guilded = !!guildId;
        const method = guilded ? Routes.applicationGuildCommands : Routes.applicationCommands;

        try {
            await this.rest.put(method(clientId, guildId), { body: commands });
            console.log(`Registered ${commands.length} application commands${guilded ? ' for guild ' + guildId : ''}.`);
        } catch (error) {
            console.error('Error registering application commands:', error);
            throw error;
        }
    }

    onceReady(callback) {
        this.client.once(Events.ClientReady, callback);
    }

    setStatus(status) {
        this.client.user.setPresence({ activities: [{ name: status }], status: PresenceUpdateStatus.Online });
    }

    /**
     * Run a callback function whenever a user interacts with the bot (e.g. sends a command)
     * @param {function} callback The function to run when a user interacts with the bot
     * @throws {Error} if the callback is not a function
     */
    onInteraction(callback) {
        if (typeof callback !== 'function')
            throw new Error('Callback must be a function');

        this.client.on(Events.InteractionCreate, callback);
    }

    getCommand(name) {
        return this.commands.get(name);
    }

    async replyTimeout(interaction, timeout) {
        await interaction.reply({ content: `You're using commands too quick! Please try again in ${timeout.toLocaleString()} milliseconds.`, flags: MessageFlags.Ephemeral });
    }

    async replyError(interaction, message) {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
}