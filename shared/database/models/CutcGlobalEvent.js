const { getClient } = require('../client');

/**
 * An event an admin sent to every Clean Up The City server
 */
class CutcGlobalEvent {
    /**
     * @param {{ kind: string, amount: number, seconds?: number, createdBy: string|number }} event How long a lasting
     *     event runs, in seconds; none for one given at once
     */
    static create({ kind, amount, seconds, createdBy }) {
        const endsAt = seconds ? new Date(Date.now() + seconds * 1000) : null;
        return getClient().cutcGlobalEvent.create({ data: { kind, amount, endsAt, createdBy: BigInt(createdBy) } });
    }

    // The lasting events still running, oldest first
    static listRunning() {
        return getClient().cutcGlobalEvent.findMany({
            where: { endsAt: { gt: new Date() } },
            orderBy: { createdAt: 'asc' },
        });
    }

    // Ends every running event of a kind now; answers how many there were
    static async endRunning(kind) {
        const now = new Date();
        const { count } = await getClient().cutcGlobalEvent.updateMany({
            where: { kind, endsAt: { gt: now } },
            data: { endsAt: now },
        });
        return count;
    }
}

module.exports = CutcGlobalEvent;