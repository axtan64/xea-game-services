require('dotenv').config();

const PORT = process.env.PORT || 3006;

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

app.use(express.json());

const swaggerOptions = require('./swagger-options');
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI setup
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/docs.json', (req, res) => res.json(swaggerSpec)); // For gateway documentation aggregation

// Routes
const trackRouter = require('./api/track');
const purchaseRouter = require('./api/purchase');
const fundsRouter = require('./api/funds');
const tunnelRouter = require('./api/tunnel');

app.use('/track', trackRouter);
app.use('/purchase', purchaseRouter);
app.use('/funds', fundsRouter);
app.use('/tunnel', tunnelRouter);

app.listen(PORT, () => {
    console.log(`Discord webhook server running on port ${PORT}`);
});
