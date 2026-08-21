const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Roblox IDs are BigInt in the schema (they can exceed Number.MAX_SAFE_INTEGER);
// JSON.stringify throws on BigInt by default, so every service returning a User/Purchase
// over HTTP would otherwise need to remember to convert it themselves.
if (typeof BigInt.prototype.toJSON !== 'function') {
    BigInt.prototype.toJSON = function toJSON() {
        return this.toString();
    };
}

let client;

function getClient() {
    if (!client) {
        const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

        client = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development'
                ? [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }]
                : [{ emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }],
        });

        if (process.env.NODE_ENV === 'development') {
            client.$on('query', (event) => {
                console.log(`Query ${event.query} took ${event.duration}ms`);
            });
        }
    }

    return client;
}

module.exports = { getClient };
