const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['level', 'gold', 'gems', 'unobtanium', 'highestLevel', 'selectedLevel', 'progress', 'totalBlocksMined', 'heroIndex', 'heroLevels', 'heroUpgrades', 'lifetimeDamage', 'timePlayed', 'achievementLevels'];
const MiningPlayerStats = createPlayerStatsModel('miningPlayerStats', STAT_FIELDS);

module.exports = { MiningPlayerStats, STAT_FIELDS };
