// Encapsulates a single command for the Discord bot. This is used to register commands with the Discord API and to handle incoming command interactions.

module.exports = class Command {
    /**
     * @param {SlashCommandBuilder} data Contains name, description, and option data on the command
     * @param {*} onExecute The function to run on execution (interaction instance as argument)
     */
    constructor(data, onExecute, cooldown=1000) {
        this.data = data;
        this.execute = onExecute;
        this.cooldown = cooldown; // Milliseconds
    }

    getData() {
        return this.data;
    }
}