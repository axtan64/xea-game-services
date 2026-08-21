const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: '🌐 Gateway API',
        version: '1.0.0',
    },
    components: {
        securitySchemes: {
            RobloxAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        }
    },
    security: [{
        RobloxAuth: [],
    }],
};

module.exports = {
    swaggerDefinition,
    apis: ['./api/*.js'],
};