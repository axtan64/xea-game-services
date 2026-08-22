const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['level', 'gold', 'highestLevel', 'selectedLevel', 'progress', 'totalBlocksMined'];
const MiningPlayerStats = createPlayerStatsModel('miningPlayerStats', STAT_FIELDS);

module.exports = { MiningPlayerStats, STAT_FIELDS };
