const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['timePlayed', 'settings', 'ownedProducts', 'cash', 'contractTokens', 'litterIndex', 'classes', 'equippedClass', 'easterEggs'];
const CutcPlayerStats = createPlayerStatsModel('cutcPlayerStats', STAT_FIELDS);

module.exports = { CutcPlayerStats, STAT_FIELDS };
