const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: '🤖 Discord Bot API',
        version: '1.0.0',
    },
};

module.exports = {
    swaggerDefinition,
    apis: ['./api/*.js'],
};