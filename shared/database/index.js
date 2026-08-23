const { getClient } = require('./client');
const User = require('./models/User');
const Purchase = require('./models/Purchase');
const Game = require('./models/Game');
const GameMembership = require('./models/GameMembership');
const { UnknownStatFieldError } = require('./models/typedStats');
const { MiningPlayerStats, STAT_FIELDS: MINING_STAT_FIELDS } = require('./models/MiningPlayerStats');
const { DonationPlayerStats, STAT_FIELDS: DONATION_STAT_FIELDS } = require('./models/DonationPlayerStats');
const DonationGift = require('./models/DonationGift');

// Maps slugs (identifiers) to their model and fields
const STATS_MODELS_BY_SLUG = {
    mining: { Model: MiningPlayerStats, fields: MINING_STAT_FIELDS },
    donation: { Model: DonationPlayerStats, fields: DONATION_STAT_FIELDS },
};

module.exports = {
    prisma: getClient(),
    User,
    Purchase,
    Game,
    GameMembership,
    MiningPlayerStats,
    MINING_STAT_FIELDS,
    DonationPlayerStats,
    DONATION_STAT_FIELDS,
    DonationGift,
    STATS_MODELS_BY_SLUG,
    UnknownStatFieldError,
};