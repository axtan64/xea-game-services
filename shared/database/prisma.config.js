require('dotenv').config();
const { defineConfig } = require('prisma/config');

// Only used by the `prisma migrate` / `prisma generate` CLI, run from this package
// directly (e.g. `npm run migrate:dev` inside shared/database with DATABASE_URL exported).
// Services consuming the generated client set their own DATABASE_URL and construct
// their own driver adapter at runtime — see client.js.
module.exports = defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
