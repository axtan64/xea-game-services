const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['timePlayed', 'settings', 'ownedProducts', 'cash', 'contractTokens', 'litterIndex', 'classes', 'equippedClass'];
const CutcPlayerStats = createPlayerStatsModel('cutcPlayerStats', STAT_FIELDS);

module.exports = { CutcPlayerStats, STAT_FIELDS };
