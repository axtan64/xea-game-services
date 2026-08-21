const { getClient } = require('./client');
const User = require('./models/User');
const Purchase = require('./models/Purchase');
const { PlayerStats, STAT_FIELDS, UnknownStatFieldError } = require('./models/PlayerStats');

module.exports = {
    prisma: getClient(),
    User,
    Purchase,
    PlayerStats,
    STAT_FIELDS,
    UnknownStatFieldError,
};
