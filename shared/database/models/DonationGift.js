const { getClient } = require('../client');

function notFound() {
    const err = new Error('No gift found with this ID');
    err.code = 'P2025';
    return err;
}

class DonationGift {
    // Create a gift model, and update the sender's donation stats.
    static create({ fromRobloxId, toRobloxId, amount, message }) {
        fromRobloxId = BigInt(fromRobloxId);
        toRobloxId = BigInt(toRobloxId);

        return getClient().$transaction(async (tx) => {
            const gift = await tx.donationGift.create({
                data: { fromRobloxId, toRobloxId, amount, message: message ?? null },
            });

            await tx.donationPlayerStats.upsert({
                where: { robloxId: fromRobloxId },
                create: { robloxId: fromRobloxId, robuxDonated: amount },
                update: { robuxDonated: { increment: amount } },
            });

            return gift;
        });
    }

    static get(id) {
        return getClient().donationGift.findUnique({ where: { id } });
    }

    static listByRecipient(toRobloxId, { limit = 50 } = {}) {
        return getClient().donationGift.findMany({
            where: { toRobloxId: BigInt(toRobloxId) },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    static listBySender(fromRobloxId, { limit = 50 } = {}) {
        return getClient().donationGift.findMany({
            where: { fromRobloxId: BigInt(fromRobloxId) },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    // Called when the recipient successfully claims a gift in-game (DELETE /gifts/:id)
    static async claim(id) {
        return getClient().$transaction(async (tx) => {
            const gift = await tx.donationGift.findUnique({ where: { id } });

            if (!gift)
                throw notFound();

            await tx.donationPlayerStats.upsert({
                where: { robloxId: gift.toRobloxId },
                create: { robloxId: gift.toRobloxId, robuxRaised: gift.amount, unclaimedRobux: gift.amount },
                update: { robuxRaised: { increment: gift.amount }, unclaimedRobux: { increment: gift.amount } },
            });

            await tx.donationGift.delete({ where: { id } });

            return gift;
        });
    }
}

module.exports = DonationGift;