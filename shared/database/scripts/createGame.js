require('dotenv').config();

const crypto = require('crypto');
const { Game } = require('../index');

/**
 * Usage: node scripts/createGame.js <slug> <name>
 * Generates a random gateway token, creates the Game row, and prints the raw token ONCE
 * 
 * Once generated, put in the game's ROBLOX_AUTH flags
 */
async function main() {
    const [slug, name] = process.argv.slice(2);

    if (!slug || !name) {
        console.error('Usage: node scripts/createGame.js <slug> <name>');
        process.exitCode = 1;
        return;
    }

    const gatewayToken = crypto.randomBytes(32).toString('hex');
    const game = await Game.create({ slug, name, gatewayToken });

    console.log(`Created game "${game.name}" (${game.id})`);
    console.log('Gateway token (save this now - it will not be shown again):');
    console.log(gatewayToken);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => process.exit());