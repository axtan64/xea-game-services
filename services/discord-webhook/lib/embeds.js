const { profileUrl, getAvatarThumbnailUrl } = require('./roblox');
const { formatRoleBullets } = require('./roles');
const {
    ROBUX: robuxEmoji,
    CAMERA_FLASH: cameraFlashEmoji,
    FLYING_MONEY: flyingMoneyEmoji,
    MONEY_BAG: moneyBagEmoji,
    PENDING: pendingEmoji,
    BANK: bankEmoji,
    LINK: linkEmoji,
} = require('../resources/emojis');

const COLOR_TRACK = 0xffd700;
const COLOR_PURCHASE = 0x2ecc71;
const COLOR_FUNDS = 0x52acff;
const COLOR_TUNNEL = 0xf6821f;

async function buildTrackEmbed({ userId, username, roles }) {
    const thumbnailUrl = await getAvatarThumbnailUrl(userId);

    return {
        title: `${cameraFlashEmoji} Notable Player Joined`,
        description: `[${username}](${profileUrl(userId)}) has joined the game!\n\n${formatRoleBullets(roles)}`,
        color: COLOR_TRACK,
        ...(thumbnailUrl && { thumbnail: { url: thumbnailUrl } }),
        timestamp: new Date().toISOString(),
    };
}

async function buildPurchaseEmbed({ userId, username, productName, robux, type }) {
    const thumbnailUrl = await getAvatarThumbnailUrl(userId);

    return {
        title: `${flyingMoneyEmoji} ${type === 'devproduct' ? 'Dev Product Purchase' : 'Gamepass Purchase'}`,
        description: `[${username}](${profileUrl(userId)}) has purchased **${productName}** for ${robuxEmoji} **${robux.toLocaleString()}**`,
        color: COLOR_PURCHASE,
        ...(thumbnailUrl && { thumbnail: { url: thumbnailUrl } }),
        timestamp: new Date().toISOString(),
    };
}

async function buildFundsEmbed({ groupName, pending, total }) {
    return {
        title: `${moneyBagEmoji} ${groupName} Group Funds`,
        color: COLOR_FUNDS,
        fields: [
            { name: `${pendingEmoji} Pending`, value: `${robuxEmoji} **${pending.toLocaleString()}**`, inline: true },
            { name: `${bankEmoji} Total`, value: `${robuxEmoji} **${total.toLocaleString()}**`, inline: true },
        ],
        timestamp: new Date().toISOString(),
    };
}

async function buildTunnelEmbed({ url }) {
    return {
        title: `${linkEmoji} Tunnel URL Changed`,
        description: `The backend's Cloudflare quick tunnel now points to:\n${url}`,
        color: COLOR_TUNNEL,
        timestamp: new Date().toISOString(),
    };
}

module.exports = { buildTrackEmbed, buildPurchaseEmbed, buildFundsEmbed, buildTunnelEmbed };
