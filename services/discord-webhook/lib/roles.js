const { VERIFIED: verifiedEmoji, SHIELD: shieldEmoji, STAR: starEmoji } = require('../resources/emojis');

const ROLE_CONFIG = {
    verified: { emoji: () => verifiedEmoji, label: 'verified' },
    admin: { emoji: () => shieldEmoji, label: 'a Roblox Admin' },
    videostar: { emoji: () => starEmoji, label: 'a Video Star Creator' },
};

function formatRoleBullets(roles) {
    return roles
        .map((role) => ROLE_CONFIG[role])
        .filter(Boolean)
        .map(({ emoji, label }) => `${emoji()} This user is ${label}`)
        .join('\n');
}

module.exports = { ROLE_CONFIG, formatRoleBullets };
