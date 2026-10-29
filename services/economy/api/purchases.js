const { Router } = require('express');
const { Purchase, User } = require('database');

const purchasesRouter = Router();

/**
 * @swagger
 * /purchases:
 *   post:
 *     summary: Log a transaction, optionally granting persistent ownership to the recipient
 *     description: >
 *       Two independent writes: (1) upsert the Purchase log row, keyed by robloxReceiptId for
 *       idempotency against ProcessReceipt retries; (2) if grantsOwnership, merge productKey=true
 *       into the recipient's <Game>PlayerStats.ownedProducts. Both must succeed for this endpoint
 *       to return 200 - callers (ProcessReceipt) should treat any non-2xx as NotProcessedYet and
 *       retry the whole request, which is safe because both writes are idempotent.
 *     tags: [Purchases]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, productId, productType, priceRobux]
 *             properties:
 *               userId: { type: string, description: "Roblox ID of the purchaser" }
 *               recipientId: { type: string, description: "Roblox ID of the recipient (defaults to userId)" }
 *               productId: { type: string }
 *               productType: { type: string, enum: [gamepass, devproduct] }
 *               priceRobux: { type: number }
 *               robloxReceiptId: { type: string, description: "Roblox ProcessReceipt PurchaseId - omit for non-receipted grants (e.g. admin /grantproduct)" }
 *               grantsOwnership: { type: boolean, default: false }
 *               productKey: { type: string, description: "Required if grantsOwnership - the key written into ownedProducts" }
 *               metadata: { type: object }
 *     responses:
 *       200: { description: Logged (and granted, if requested) successfully }
 *       400: { description: Invalid body, or this game has no ownedProducts field and grantsOwnership was set }
 *       500: { description: Write failed - caller should retry the whole request later }
 */
purchasesRouter.post('/', async (req, res) => {
    const { userId, recipientId, productId, productType, priceRobux, robloxReceiptId, grantsOwnership, productKey, metadata } = req.body ?? {};

    if (!userId || !productId || !['gamepass', 'devproduct'].includes(productType) || typeof priceRobux !== 'number')
        return res.status(400).json({ error: 'userId, productId, productType (gamepass|devproduct), and priceRobux (number) are required' });

    if (grantsOwnership && !productKey)
        return res.status(400).json({ error: 'productKey is required when grantsOwnership is true' });

    const effectiveRecipientId = recipientId ?? userId;

    if (grantsOwnership) {
        const { fields } = req.stats ?? {};
        if (!fields || !fields.includes('ownedProducts'))
            return res.status(400).json({ error: `Game "${req.gameSlug}" has no ownedProducts stat field` });
    }

    let purchaser, recipient;
    try {
        purchaser = await User.getOrCreateByRobloxId(userId);
        recipient = recipientId ? await User.getOrCreateByRobloxId(recipientId) : purchaser;
    } catch (err) {
        console.error('Error resolving user(s) for purchase:', err);
        return res.status(500).json({ error: 'Failed to resolve user(s)' });
    }

    let purchase;
    try {
        purchase = await Purchase.upsertByReceiptId({
            gameId: req.gameId,
            userId: purchaser.id,
            recipientId: recipient.id,
            productId,
            productType,
            priceRobux,
            robloxReceiptId,
            metadata,
        });
    } catch (err) {
        console.error('Error logging purchase:', err);
        return res.status(500).json({ error: 'Failed to log purchase - retry the whole request' });
    }

    if (grantsOwnership) {
        try {
            const { Model } = req.stats;
            const existing = await Model.get(effectiveRecipientId);
            const ownedProducts = { ...(existing?.ownedProducts ?? {}), [String(productKey)]: true };
            await Model.upsert(effectiveRecipientId, { ownedProducts });
        } catch (err) {
            console.error('Error granting ownership:', err);
            return res.status(500).json({ error: 'Purchase logged, but ownership grant failed - retry the whole request' });
        }
    }

    res.json({ purchase, granted: Boolean(grantsOwnership) });
});

module.exports = purchasesRouter;