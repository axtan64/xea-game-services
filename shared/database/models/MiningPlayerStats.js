const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['level', 'gold', 'gems', 'unobtanium', 'highestLevel', 'progress', 'progressLevel', 'totalBlocksMined', 'heroIndex', 'heroLevels', 'heroUpgrades', 'lifetimeDamage', 'timePlayed', 'achievementLevels', 'settings', 'objectivesCompleted'];
const MiningPlayerStats = createPlayerStatsModel('miningPlayerStats', STAT_FIELDS);

module.exports = { MiningPlayerStats, STAT_FIELDS };
