require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 3006;

const app = express();
app.use(express.json());
app.use(cookieParser());

const requireAuth = require('./middleware/requireAuth');
const { purchasesRouter } = require('./api/purchases');
const { startCcuPolling } = require('./lib/ccu');
const { BanError } = require('./lib/robloxBans');

app.use('/auth', require('./api/auth'));
app.use('/api/settings', require('./api/settings'));
app.use('/api/overview', requireAuth, require('./api/overview'));
app.use('/api/games', requireAuth, require('./api/games'));
app.use('/api/purchases', requireAuth, purchasesRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Anything else under /api is a wrong address, not a page of the SPA
app.use('/api', (req, res) => res.status(404).json({ error: 'No such API route' }));

// An error a route threw (Express 5 passes on rejected promises): a bad JSON body is the caller's, anything else ours
app.use('/api', (err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body isn\'t valid JSON' });

    // Roblox's ban API said no, or the game isn't set up for it: say why
    if (err instanceof BanError) return res.status(err.status).json({ error: err.message });

    console.error(`Dashboard ${req.method} ${req.originalUrl} failed:`, err);
    res.status(500).json({ error: 'Something went wrong on the server; its log says what' });
});

// Serve the built SPA - a plain catch-all middleware (not a '*' route) since Express 5's
// router (path-to-regexp v8) rejects a bare '*' wildcard pattern
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.use((req, res) => res.sendFile(path.join(clientDist, 'index.html')));

app.listen(PORT, () => {
    console.log(`Dashboard running on port ${PORT}`);
    // Every game's players at once, for the overview's Highest CCU and CCU now
    startCcuPolling();
});