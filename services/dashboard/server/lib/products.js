// The passes the dashboard can give a player, by game slug. Each `key` is what the game reads in the player's
// ownedProducts, and `productId` its Roblox game pass ID, logged with the grant. They must match the game's own
// list: for Clean Up The City, client/ReplicatedStorage/Resources/Economy/StoreProducts.luau (its Pass products)
const GRANTABLE = {
    cutc: [
        { key: 'DoubleCash', name: '2x Cash', productId: '2093763971' },
        { key: 'BigBag', name: 'Bigger Bag', productId: '2092792067' },
        { key: 'StylePass', name: 'Style Pass', productId: '2093776071' },
        { key: 'BigCity', name: '100-Player City', productId: '2093890026' },
        { key: 'InfiniteSprint', name: 'Infinite Sprint', productId: '2092594329' },
        { key: 'InfiniteBoost', name: 'Infinite Turbo Boost', productId: '2096448273' },
        { key: 'DoubleLuck', name: '2x Luck', productId: '2093650311' },
        { key: 'GliderPass', name: 'Glider', productId: '2094376419' },
    ],
};

function grantable(slug) {
    return GRANTABLE[slug] ?? [];
}

function findGrantable(slug, key) {
    return grantable(slug).find((product) => product.key === key) ?? null;
}

module.exports = { grantable, findGrantable };