require('dotenv').config();

const PORT = process.env.PORT || 3001;

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

const gameContext = require('./middleware/gameContext');

// Routes
const userRouter = require('./api/user');
const giftsRouter = require('./api/gifts');

app.use(gameContext);
app.use('/gifts', giftsRouter); // mounted before '/' - userRouter's /:userId would otherwise swallow it
app.use('/', userRouter);

app.listen(PORT, () => {
    console.log(`Users server running on port ${PORT}`);
});