/**
 * Dynamic programming approach which finds the combination of gamepasses (each reusable any number of times) that gets as close as possible to `aimAmount` without exceeding it, using as few gamepasses as possible
 * @param {{ price: number }[]} gamepasses List of available gamepasses (w/ price attribute)
 * @param {number} aimAmount Target sum (not exceeded...)
 * @param {number} maxGamepasses Maximum number of gamepasses allowed in the result
 * @returns {{ totalPrice: number, chosen: object[] }} The best achievable sum, and the gamepasses that make it up
 */
function findBestCombination(gamepasses, aimAmount, maxGamepasses) {
    if (aimAmount <= 0 || maxGamepasses <= 0 || gamepasses.length === 0)
        return { totalPrice: 0, chosen: [] };

    // Maps price in Robux to a gamepass with that price
    const byPrice = new Map();

    for (const gamepass of gamepasses)
        if (gamepass.price > 0 && gamepass.price <= aimAmount && !byPrice.has(gamepass.price))
            byPrice.set(gamepass.price, gamepass);

    // All gamepass prices we can choose from...
    const prices = [...byPrice.keys()];

    if (prices.length === 0)
        return { totalPrice: 0, chosen: [] };

    const maxPrice = Math.max(...prices);

    const reachableCeiling = maxGamepasses * maxPrice; // "max we could ever hope to reach in n gamepasses"
    const dpLimit = Math.min(aimAmount, reachableCeiling);

    const minCount = new Array(dpLimit + 1).fill(Infinity); // minCount[s] = fewest gamepasses needed to make exactly s
    const usedPrice = new Array(dpLimit + 1).fill(0); // usedPrice[s] = price of the last gamepass used to make exactly s
    minCount[0] = 0;

    // Fill minCount and usedPrice
    for (let sum = 1; sum <= dpLimit; sum++) {
        for (const price of prices) {
            if (price > sum) continue;

            const candidate = minCount[sum - price] + 1;

            if (candidate < minCount[sum]) {
                minCount[sum] = candidate;
                usedPrice[sum] = price;
            }
        }
    }

    let bestSum = 0; // "best we can do with the gamepasses available"

    // Keep iterating backwards in minCount until we find an entry which fits the n gamepass requirement
    for (let sum = dpLimit; sum >= 0; sum--) {
        if (minCount[sum] <= maxGamepasses) {
            bestSum = sum;
            break;
        }
    }

    // begin crafting result (i.e., which gamepasses to use)
    const chosen = [];
    let remaining = bestSum;

    while (remaining > 0) {
        const price = usedPrice[remaining];
        chosen.push(byPrice.get(price));
        remaining -= price;
    }

    return { totalPrice: bestSum, chosen };
}

module.exports = { findBestCombination };