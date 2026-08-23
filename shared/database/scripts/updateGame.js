require('dotenv').config();

const { Game } = require('../index');

/**
 * Usage: node scripts/updateGame.js <slug> [--token <raw>] [--universe-id <id>] [--api-key <key>]
 * Only touches the fields whose flag is passed, and outputs the updated game record to the console
 * Discord webhook URLs aren't a Game field - see services/discord-webhook/.env.example
 */
function parseArgs(argv) {
    const [slug, ...rest] = argv;
    const flags = {};

    for (let i = 0; i < rest.length; i += 2)
        flags[rest[i]] = rest[i + 1];

    return {
        slug,
        token: flags['--token'],
        universeId: flags['--universe-id'],
        apiKey: flags['--api-key'],
    };
}

async function main() {
    const { slug, token, universeId, apiKey } = parseArgs(process.argv.slice(2));

    if (!slug || (token === undefined && universeId === undefined && apiKey === undefined)) {
        console.error('Usage: node scripts/updateGame.js <slug> [--token <raw>] [--universe-id <id>] [--api-key <key>]');
        process.exitCode = 1;
        return;
    }

    if (token !== undefined)
        await Game.rotateToken(slug, token);

    const game = await Game.update(slug, {
        ...(universeId !== undefined && { robloxUniverseId: universeId }),
        ...(apiKey !== undefined && { robloxOpenCloudApiKey: apiKey }),
    });

    console.log(game);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => process.exit());