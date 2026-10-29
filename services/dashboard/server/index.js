require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 3006;

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/auth', require('./api/auth'));
app.use('/api/settings', require('./api/settings'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built SPA - a plain catch-all middleware (not a '*' route) since Express 5's
// router (path-to-regexp v8) rejects a bare '*' wildcard pattern
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.use((req, res) => res.sendFile(path.join(clientDist, 'index.html')));

app.listen(PORT, () => {
    console.log(`Dashboard running on port ${PORT}`);
});
