require('dotenv').config();

const PORT = process.env.PORT || 3003;

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

app.use(express.json());

const swaggerOptions = require('./swagger-options');
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/docs.json', (req, res) => res.json(swaggerSpec)); // For gateway documentation aggregation

const gameContext = require('./middleware/gameContext');

app.use(gameContext);
app.use('/purchases', require('./api/purchases'));

app.listen(PORT, () => {
    console.log(`Economy server running on port ${PORT}`);
});