const { getClient } = require('../client');

function notFound() {
    const err = new Error('No gift found with this ID');
    err.code = 'P2025';
    return err;
}

function alreadyClaimed() {
    const err = new Error('This gift has already been claimed');
    err.code = 'ALREADY_CLAIMED';
    return err;
}

class Donation {
    // Record a donation, and credit the sender's robuxDonated immediately (starts off unclaimed)
    static create({ fromRobloxId, toRobloxId, amount, message }) {
        fromRobloxId = BigInt(fromRobloxId);
        toRobloxId = BigInt(toRobloxId);

        return getClient().$transaction(async (tx) => {
            const donation = await tx.donation.create({
                data: { fromRobloxId, toRobloxId, amount, message: message ?? null },
            });

            await tx.donationPlayerStats.upsert({
                where: { robloxId: fromRobloxId },
                create: { robloxId: fromRobloxId, robuxDonated: amount },
                update: { robuxDonated: { increment: amount } },
            });

            return donation;
        });
    }

    static get(id) {
        return getClient().donation.findUnique({ where: { id } });
    }

    // A player's pending (unclaimed) gifts
    static listPendingByRecipient(toRobloxId, { limit = 50 } = {}) {
        return getClient().donation.findMany({
            where: { toRobloxId: BigInt(toRobloxId), claimedAt: null },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    static listBySender(fromRobloxId, { limit = 50 } = {}) {
        return getClient().donation.findMany({
            where: { fromRobloxId: BigInt(fromRobloxId) },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    // Called when the recipient successfully claims a gift in-game (DELETE /gifts/:id)
    static async claim(id) {
        return getClient().$transaction(async (tx) => {
            const donation = await tx.donation.findUnique({ where: { id } });

            if (!donation)
                throw notFound();

            if (donation.claimedAt)
                throw alreadyClaimed();

            await tx.donationPlayerStats.upsert({
                where: { robloxId: donation.toRobloxId },
                create: { robloxId: donation.toRobloxId, robuxRaised: donation.amount, unclaimedRobux: donation.amount },
                update: { robuxRaised: { increment: donation.amount }, unclaimedRobux: { increment: donation.amount } },
            });

            // "set the claimedAt time to indicate this gift is claimed"
            return tx.donation.update({ where: { id }, data: { claimedAt: new Date() } });
        });
    }

    /**
     * Retrieve the players who have donated the most to `toRobloxId` aggregated from the Donation ledger
     * @param {BigInt} toRobloxId ID of the receiver
     * @param {Object} options Options for pagination
     * @param {number} options.page Page number (default: 1)
     * @param {number} options.pageSize Number of results per page (default: 10)
     * @returns {Promise<Array<{ fromRobloxId: BigInt, totalAmount: number }>>} List of top donors with their total donated amount
     */
    static async topDonorsTo(toRobloxId, { page = 1, pageSize = 10 } = {}) {
        const grouped = await getClient().donation.groupBy({
            by: ['fromRobloxId'],
            where: { toRobloxId: BigInt(toRobloxId) },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        return grouped.map((row) => ({ fromRobloxId: row.fromRobloxId, totalAmount: row._sum.amount }));
    }
}

module.exports = Donation;