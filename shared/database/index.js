const { getClient } = require('./client');
const User = require('./models/User');
const Purchase = require('./models/Purchase');
const Game = require('./models/Game');
const GameMembership = require('./models/GameMembership');
const { UnknownStatFieldError } = require('./models/typedStats');
const { MiningPlayerStats, STAT_FIELDS: MINING_STAT_FIELDS } = require('./models/MiningPlayerStats');
const { DonationPlayerStats, STAT_FIELDS: DONATION_STAT_FIELDS } = require('./models/DonationPlayerStats');
const { CutcPlayerStats, STAT_FIELDS: CUTC_STAT_FIELDS } = require('./models/CutcPlayerStats');
const CutcSaveSlot = require('./models/CutcSaveSlot');
const CutcParty = require('./models/CutcParty');
const CutcSlotAccess = require('./models/CutcSlotAccess');
const CutcGlobalEvent = require('./models/CutcGlobalEvent');
const Donation = require('./models/Donation');
const MiningLike = require('./models/MiningLike');
const CutcLike = require('./models/CutcLike');
const Setting = require('./models/Setting');

// Maps slugs (identifiers) to their model and fields
const STATS_MODELS_BY_SLUG = {
    mining: { Model: MiningPlayerStats, fields: MINING_STAT_FIELDS },
    donation: { Model: DonationPlayerStats, fields: DONATION_STAT_FIELDS },
    cutc: { Model: CutcPlayerStats, fields: CUTC_STAT_FIELDS },
};

// Maps slugs to their game's likes (purely cosmetic, one table per game); a game missing here has none
const LIKE_MODELS_BY_SLUG = {
    mining: MiningLike,
    cutc: CutcLike,
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
    CutcPlayerStats,
    CUTC_STAT_FIELDS,
    CutcSaveSlot,
    CutcParty,
    CutcSlotAccess,
    CutcGlobalEvent,
    Donation,
    MiningLike,
    CutcLike,
    Setting,
    STATS_MODELS_BY_SLUG,
    LIKE_MODELS_BY_SLUG,
    UnknownStatFieldError,
};