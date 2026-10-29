const { getClient } = require('../client');

// A value set by the admin dashboard during runtime
class Setting {
    static async get(key) {
        const row = await getClient().setting.findUnique({ where: { key } });
        return row?.value;
    }

    // Fetch a setting's value, falling back to a default (e.g. an env var) if unset
    static async getOrDefault(key, fallback) {
        const value = await Setting.get(key);
        return value ?? fallback;
    }

    static set(key, value) {
        return getClient().setting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
    }
}

module.exports = Setting;