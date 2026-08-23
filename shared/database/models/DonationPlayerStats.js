const { createPlayerStatsModel } = require('./typedStats');

const STAT_FIELDS = ['credits', 'unclaimedRobux', 'robuxRaised', 'robuxDonated'];
const DonationPlayerStats = createPlayerStatsModel('donationPlayerStats', STAT_FIELDS);

module.exports = { DonationPlayerStats, STAT_FIELDS };