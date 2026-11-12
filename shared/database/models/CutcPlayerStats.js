const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['timePlayed', 'settings', 'ownedProducts'];
const CutcPlayerStats = createPlayerStatsModel('cutcPlayerStats', STAT_FIELDS);

module.exports = { CutcPlayerStats, STAT_FIELDS };
