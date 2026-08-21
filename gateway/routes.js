/**
 * Represents a microservice route beyond the gateway. Includes links to the service's API documentation if available.
 */
class Route {
    /**
     * Create a new Route
     * @param {string} origin Base URL of the microservice (e.g. http://localhost:3001)
     * @param {string} [docs] Optional path to the microservice's API documentation (e.g. /docs)
     */
    constructor(origin, docs) {
        this.origin = origin;
        this.docs = docs;
    }
}

module.exports = {
    '/communication': new Route(process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3001', '/docs.json'),
    '/discord': new Route(process.env.DISCORD_SERVICE_URL || 'http://localhost:3002', undefined),
    '/economy': new Route(process.env.ECONOMY_SERVICE_URL || 'http://localhost:3003', undefined),
    '/proxy': new Route(process.env.PROXY_SERVICE_URL || 'http://localhost:3004', '/docs.json'),
    '/users': new Route(process.env.USERS_SERVICE_URL || 'http://localhost:3005', '/docs.json'),
    '/discord-webhook': new Route(process.env.DISCORD_WEBHOOK_SERVICE_URL || 'http://localhost:3006', '/docs.json')
}