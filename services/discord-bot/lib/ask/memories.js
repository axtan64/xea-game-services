// Finds the memories (chunks of Xea's own Discord messages) that /ask shows the model.
// The embedding pipeline is built once and kept; the nearest chunks are thinned out with MMR so the model
// sees several different memories instead of five versions of the same one.

const path = require('path');
const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');
const { pipeline } = require('@xenova/transformers');

const { toShortcodes } = require('./emojiText.js');

const DB_PATH = path.resolve(__dirname, '../../resources/memories.db');
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

const CANDIDATES = 30;          // nearest chunks fetched before picking
const BUDGET = 3600;            // characters of memory text shown to the model
const MAX_CHUNK = 900;          // longest a single memory may be, so one chunk can't take the whole budget
const MMR_LAMBDA = 0.7;         // 1 = only relevance, 0 = only difference from what's already picked
const MIN_RELEVANCE = 0.2;      // cosine similarity below which a chunk is about something else

let db = null;
let extractorPromise = null;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
        sqliteVec.load(db);
    }
    return db;
}

function getExtractor() {
    if (!extractorPromise) {
        extractorPromise = pipeline('feature-extraction', MODEL_NAME)
            .catch((err) => {
                extractorPromise = null; // let the next call try again
                throw err;
            });
    }
    return extractorPromise;
}

/**
 * Opens the database and loads the embedding model ahead of the first question.
 */
async function warmUp() {
    getDb();
    await getExtractor();
}

/**
 * @param {string} text
 * @returns {Promise<Float32Array>} the text's normalised 384-dimension embedding
 */
async function embed(text) {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data);
}

function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

// Copied, since a view straight onto the Buffer fails when its offset in Node's pool isn't a multiple of 4
function toVector(blob) {
    return new Float32Array(new Uint8Array(blob).buffer);
}

/**
 * Makes a stored chunk fit to show the model: no pings or ids, emoji as :name:, spam squashed.
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
    return toShortcodes(text)
        .replace(/<@!?\d+>/g, '@someone')
        .replace(/<@&\d+>/g, '@role')
        .replace(/<#\d+>/g, '#channel')
        .replace(/https?:\/\/(?:www\.)?([^/\s]+)\S*/g, '($1 link)')
        .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '(email)')
        .replace(/ \(edited\)$/gm, '')
        // A wall of spam is kept to a dozen, so it shows how he spams without eating the budget
        .replace(/((:\w+:)\s*)\1{12,}/g, (wall, one) => one.repeat(12))
        .replace(/((\p{Extended_Pictographic}️?)\s*)\1{12,}/gu, (wall, one) => one.repeat(12))
        .replace(/(.)\1{24,}/g, (run, c) => c.repeat(24))
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');
}

function trimChunk(text) {
    if (text.length <= MAX_CHUNK) return text;
    const cut = text.lastIndexOf('\n', MAX_CHUNK);
    return text.slice(0, cut > MAX_CHUNK / 2 ? cut : MAX_CHUNK);
}

// A chunk with hardly any words (a wall of emoji, a lone "LOL") says nothing about the question
function hasSubstance(text) {
    const words = text.replace(/:\w+:/g, '').match(/[a-z]{2,}/gi);
    return (words?.length ?? 0) >= 4;
}

/**
 * Picks memories for a question: the nearest CANDIDATES chunks, then MMR within BUDGET characters.
 * @param {string} question
 * @returns {Promise<{ text: string, date: string, relevance: number }[]>} in date order
 */
async function findMemories(question) {
    const query = await embed(question);

    const rows = getDb().prepare(`
        WITH knn AS (
            SELECT rowid, distance, embedding
            FROM memory_embeddings
            WHERE embedding MATCH ? AND k = ?
        )
        SELECT m.id, m.text, m.start_time, knn.embedding
        FROM knn
        JOIN memories m ON m.id = knn.rowid
        ORDER BY knn.distance
    `).all(query, CANDIDATES);

    const candidates = [];
    const seen = new Set();
    for (const row of rows) {
        const text = trimChunk(cleanText(row.text));
        const key = text.toLowerCase().replace(/[^a-z]/g, '');
        if (!hasSubstance(text) || seen.has(key)) continue;
        seen.add(key);

        const vector = toVector(row.embedding);
        const relevance = dot(query, vector);
        if (relevance < MIN_RELEVANCE) continue;

        candidates.push({ text, date: (row.start_time || '').slice(0, 7), relevance, vector });
    }

    const picked = [];
    let used = 0;
    while (candidates.length > 0) {
        let best = -1;
        let bestScore = -Infinity;
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            let redundancy = 0;
            for (const p of picked) redundancy = Math.max(redundancy, dot(c.vector, p.vector));
            const score = MMR_LAMBDA * c.relevance - (1 - MMR_LAMBDA) * redundancy;
            if (score > bestScore) {
                bestScore = score;
                best = i;
            }
        }

        const [chosen] = candidates.splice(best, 1);
        if (used + chosen.text.length > BUDGET) continue; // too long for what's left; a shorter one may fit
        picked.push(chosen);
        used += chosen.text.length;
    }

    return picked
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(({ text, date, relevance }) => ({ text, date, relevance }));
}

module.exports = { warmUp, embed, findMemories, cleanText };