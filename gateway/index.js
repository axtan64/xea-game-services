require('dotenv').config();

const PORT = process.env.PORT || 3000;

const express = require('express');
const crypto = require('crypto');
const httpProxy = require('http-proxy');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const proxy = httpProxy.createProxyServer();

const authenticate = require('./middleware/authenticate');
const health = require('./middleware/health');
const forwarder = require('./middleware/forwarder');
const routes = require('./routes');
const swaggerOptions = require('./swagger-options');

const { swaggerDefinition } = swaggerOptions;

const documentation = require('./middleware/documentation')(swaggerDefinition, routes);

// Swagger UI setup
app.use('/docs', swaggerUi.serve, async (req, res, next) => {
    const spec = await documentation();
    swaggerUi.setup(spec)(req, res, next);
});

// Authentication. Note: no express.json() here - the forwarder pipes the raw
// request stream through to the target service, and body-parsing would drain it first.
app.use(authenticate);
app.use('/health', health);

// Microservice Routing
app.use(forwarder(proxy, routes));

app.listen(PORT, () => {
    console.log(`Gateway server running on port ${PORT}`);
});