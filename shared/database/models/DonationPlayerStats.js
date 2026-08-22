const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['credits', 'unclaimedRobux'];
const DonationPlayerStats = createPlayerStatsModel('donationPlayerStats', STAT_FIELDS);

module.exports = { DonationPlayerStats, STAT_FIELDS };
