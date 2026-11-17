const { randomBytes } = require('crypto');
const { getClient } = require('../client');

// Who may join a city besides its owner
const ACCESS = ['Nobody', 'Invited', 'Friends'];
// What a slot nobody has set up is: its owner's friends, while its owner is playing
const DEFAULTS = { access: 'Friends', allowAway: false, inviteCode: null, members: [] };
// Invited players a slot may have
const MAX_MEMBERS = 50;
// An invite code is this many characters from an alphabet
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 20;
const CODE_ATTEMPTS = 5;

const key = (ownerId, slot) => ({ ownerId: BigInt(ownerId), slot });

// Members are kept as strings: Roblox IDs outgrow 32 bits, and JSON has no BigInt
const asMember = (userId) => String(userId);

function newCode() {
    const bytes = randomBytes(CODE_LENGTH);
    let code = '';

    for (let index = 0; index < CODE_LENGTH; index++)
        code += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];

    return code;
}

// Codes are shown in groups of four with dashes, and typed any which way
const normalizeCode = (code) => String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Who may join each of a player's save slots in Clean Up The City, kept apart from the save so wiping a slot
 * keeps its sharing, and so a slot can be set up before it is ever played. `access` is Nobody, Invited (its
 * `members`, who each entered its invite code) or Friends (the owner's Roblox friends, and its members);
 * `allowAway` lets them play the city while its owner isn't in it.
 */
class CutcSlotAccess {
    // A slot's sharing, or the defaults if its owner has never touched it
    static async get(ownerId, slot) {
        const row = await getClient().cutcSlotAccess.findUnique({ where: { ownerId_slot: key(ownerId, slot) } });
        return row ?? { ownerId: BigInt(ownerId), slot, ...DEFAULTS };
    }

    // Every slot of a player's that has been set up
    static list(ownerId) {
        return getClient().cutcSlotAccess.findMany({ where: { ownerId: BigInt(ownerId) }, orderBy: { slot: 'asc' } });
    }

    static set(ownerId, slot, { access, allowAway }) {
        const where = key(ownerId, slot);
        const data = { access, allowAway };

        return getClient().cutcSlotAccess.upsert({ where: { ownerId_slot: where }, create: { ...where, ...data }, update: data });
    }

    // Give the slot a new invite code; the old one stops working. Whoever is already a member stays one
    static async newInvite(ownerId, slot) {
        const where = key(ownerId, slot);

        for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt++) {
            const inviteCode = newCode();

            try {
                return await getClient().cutcSlotAccess.upsert({
                    where: { ownerId_slot: where },
                    create: { ...where, inviteCode },
                    update: { inviteCode },
                });
            } catch (error) {
                // P2002: another slot already has this code. Vanishingly unlikely, but try another
                if (error.code !== 'P2002' || attempt === CODE_ATTEMPTS) throw error;
            }
        }
    }

    /**
     * Make a player a member of whichever slot has this invite code.
     * @returns {{ access: object }|{ refusal: string }} The slot's sharing, or why not: Unknown (no such
     *     code), Own (it is their own slot) or Full
     */
    static async redeem(code, userId) {
        const inviteCode = normalizeCode(code);
        if (inviteCode.length !== CODE_LENGTH) return { refusal: 'Unknown' };

        const row = await getClient().cutcSlotAccess.findUnique({ where: { inviteCode } });
        if (!row) return { refusal: 'Unknown' };
        if (row.ownerId === BigInt(userId)) return { refusal: 'Own' };

        const members = Array.isArray(row.members) ? row.members : [];
        if (members.includes(asMember(userId))) return { access: row };
        if (members.length >= MAX_MEMBERS) return { refusal: 'Full' };

        return {
            access: await getClient().cutcSlotAccess.update({
                where: { id: row.id },
                data: { members: [...members, asMember(userId)] },
            }),
        };
    }

    // Take one member off a slot, or with no `userId` all of them. Returns the slot's sharing as it now is
    static async removeMembers(ownerId, slot, userId) {
        const row = await getClient().cutcSlotAccess.findUnique({ where: { ownerId_slot: key(ownerId, slot) } });
        if (!row) return CutcSlotAccess.get(ownerId, slot);

        const members = Array.isArray(row.members) ? row.members : [];
        const kept = userId == null ? [] : members.filter((member) => member !== asMember(userId));

        return getClient().cutcSlotAccess.update({ where: { id: row.id }, data: { members: kept } });
    }

    /**
     * The slots a player might join: any they are a member of, and their friends' that are open to friends.
     * Slots shut to everyone are left out.
     * @param {number[]} friendIds The player's Roblox friends, as the game server read them
     */
    static findOpenTo(userId, friendIds) {
        return getClient().cutcSlotAccess.findMany({
            where: {
                ownerId: { not: BigInt(userId) },
                OR: [
                    { access: 'Friends', ownerId: { in: friendIds.map((id) => BigInt(id)) } },
                    { access: { in: ['Invited', 'Friends'] }, members: { array_contains: [asMember(userId)] } },
                ],
            },
        });
    }

    static isMember(access, userId) {
        return Array.isArray(access.members) && access.members.includes(asMember(userId));
    }

    // A code as it is shown: in groups of four
    static formatCode(code) {
        return code ? code.match(/.{1,4}/g).join('-') : null;
    }
}

CutcSlotAccess.ACCESS = ACCESS;
CutcSlotAccess.DEFAULTS = DEFAULTS;
CutcSlotAccess.MAX_MEMBERS = MAX_MEMBERS;

module.exports = CutcSlotAccess;