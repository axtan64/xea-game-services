module.exports = class LRUCache {
    constructor(limit) {
        this.limit = limit;
        this.cache = new Map();
    }

    /**
     * Get a value from the cache (if the key exists)
     * @param {*} k The key to retrieve
     * @returns {*} The value associated with the key, or null if not found
     */
    get(k) {
        const keyExists = this.cache.has(k);

        if(!keyExists)
            return null;

        const v = this.cache.get(k);

        this.cache.delete(k);
        this.cache.set(k, v);
        
        return v;
    }

    /**
     * Set a value in the cache
     * @param {*} k The key to set
     * @param {*} value The value to associate with the key
     */
    set(k, v) {
        const keyExists = this.cache.has(k);

        if(keyExists)
            this.cache.delete(k);
        else if(this.size >= this.limit) {
            const k0 = this.cache.keys().next().value; // "first key"

            this.cache.delete(k0);
        }

        this.cache.set(k, v);
    }

    values() {
        return this.cache.values();
    }

    get size() {
        return this.cache.size;
    }
}