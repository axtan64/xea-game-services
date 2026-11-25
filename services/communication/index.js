require('dotenv').config();

const PORT = process.env.PORT || 3000;

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
const announceRouter = require('./api/announce');
const productGrantRouter = require('./api/productGrant');
const accountChangedRouter = require('./api/accountChanged');
const softRestartRouter = require('./api/softRestart');
const globalEventRouter = require('./api/globalEvent');

app.use('/announce', announceRouter);
app.use('/product-grant', productGrantRouter);
app.use('/account-changed', accountChangedRouter);
app.use('/soft-restart', softRestartRouter);
app.use('/global-event', globalEventRouter);

app.listen(PORT, () => {
    console.log(`Communication server running on port ${PORT}`);
});