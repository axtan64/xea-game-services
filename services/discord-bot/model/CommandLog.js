// An interface for the ChatXea logs held in the database, which contain data on commands executed by users, results, and timestamps.

const LRUCache = require('../model/LRUCache.js');

class LogItem {
    constructor(userId, commandName, result, timestamp) {
        this.userId = userId;
        this.commandName = commandName;
        this.result = result;
        this.timestamp = timestamp;
    }

    toJSON() {
        return {
            userId: this.userId,
            commandName: this.commandName,
            result: this.result,
            timestamp: this.timestamp
        };
    }

    get key() {
        return `${this.userId}:${this.commandName}:${this.timestamp}`;
    }
}

module.exports = class CommandLog {
    constructor(limit=100) {
        this.cache = new LRUCache(limit);
    }

    query({ userId=null, commandName=null, limit=10 }={}) {
        const logs = [];

        for (const logItem of this.cache.values()) {
            if (userId && logItem.userId !== userId) continue;
            if (commandName && logItem.commandName !== commandName) continue;
            logs.push(logItem.toJSON());
            if (logs.length >= limit) break;
        }

        return logs;
    }

    push(userId, commandName, result) {
        const timestamp = new Date().toISOString();

        const logItem = new LogItem(userId, commandName, result, timestamp);

        this.cache.set(logItem.key, logItem);
    }
}