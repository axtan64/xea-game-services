const crypto = require('crypto');

// Gateway tokens are stored hashed (Game.gatewayTokenHash), never in plaintext, so a DB read/leak doesn't hand over a live credential
function hashGatewayToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { hashGatewayToken };