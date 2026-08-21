require('dotenv').config();

const PORT = process.env.PORT || 3002;
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const Bot = require('./model/Bot.js');
const { ping, ask } = require('./commands/index.js');

const bot = new Bot(TOKEN);

bot.registerCommands(ping, ask);

bot.onceReady(async () => {
    try {
        // Try deploying commands to Discord
        await bot.deployCommands(CLIENT_ID);
        console.log('Commands deployed successfully.');

        // Try setting the bot's status
        await bot.setStatus("hi i'm xea PLEASE HELP ME");
        console.log('Bot status set successfully.');
    } catch (error) {
        console.error('Error deploying ChatXea:', error);
        process.exit(1);
    }
})

bot.onInteraction(async (interaction) => {
    // Must be a chat command
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    const command = bot.getCommand(commandName);

    if(!command) return;

    // Must not be on cooldown
    const userId = interaction.user.id;
    const log = bot.logs.query({ userId, commandName, limit: 1 })[0];
    const logTime = log ? new Date(log.timestamp).getTime() : 0;

    const now = Date.now();
    const expiration = logTime + (command.cooldown || 0);

    console.log(log);

    // If user is still on cooldown, inform them of the remaining time
    if(now < expiration)
        return await bot.replyTimeout(interaction, expiration - now);

    // Can use the command, log the usage
    bot.logs.push(userId, commandName, 'success');

    // Try running the command
    try {
        await command.execute(interaction);
    } catch (e) {
        console.error(`Error executing command ${commandName}:`, e);

        // Inform the user their command could not be ran
        const body = bot.replyError(interaction, 'An error occurred while executing the command. Please try again later.');
        if (interaction.replied || interaction.deferred)
            await interaction.followUp(body);
        else
            await interaction.reply(body);
    }
})

// Try logging in to Discord
bot.login().catch((error) => {
    console.error('Error logging in to Discord:', error);
    process.exit(1);
});