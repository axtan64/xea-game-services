// Roblox accounts allowed to sign in to this dashboard, keyed by their Roblox user ID (+ their rank)
const ADMINS = {
    '9218846': 'Developer', // xeavz
};

function getAdminRank(userId) {
    return ADMINS[String(userId)];
}

function isAdmin(userId) {
    return Object.prototype.hasOwnProperty.call(ADMINS, String(userId));
}

module.exports = { ADMINS, getAdminRank, isAdmin };