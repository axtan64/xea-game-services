require('dotenv').config();

const PORT = process.env.PORT || 3004;

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
const followingRouter = require('./api/following');
const likesRouter = require('./api/likes');
const verifiedRouter = require('./api/verified');
const groupsRouter = require('./api/groups');
const robloxBadgesRouter = require('./api/roblox-badges');
const maxClaimRouter = require('./api/max-claim');

app.use('/following', followingRouter);
app.use('/likes', likesRouter);
app.use('/verified', verifiedRouter);
app.use('/groups', groupsRouter);
app.use('/roblox-badges', robloxBadgesRouter);
app.use('/max-claim', maxClaimRouter);

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
