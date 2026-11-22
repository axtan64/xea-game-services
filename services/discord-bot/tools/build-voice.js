// Picks /ask's voice pack from resources/memories.db: about 50 short lines of Xea's that cover the range of
// what he says (one from each of 50 clusters of their embeddings), and the style figures the system prompt
// quotes. Writes them into resources/voice.json, keeping its hand-written `examples`.
// Run once from services/discord-bot: node tools/build-voice.js   (the db is gitignored; the json is committed)

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const { embed, cleanText } = require('../lib/ask/memories.js');
const { toShortcodes } = require('../lib/ask/emojiText.js');

const VOICE_PATH = path.resolve(__dirname, '../resources/voice.json');
const DB_PATH = path.resolve(__dirname, '../resources/memories.db');

const SAMPLES = 50;
const POOL = 3000;          // lines embedded and clustered
const MIN_LENGTH = 20;
const MAX_LENGTH = 150;
const SEED = 20261122;

// Lines left out on review: other people's names and details, copied text, things that only make sense in context
const EXCLUDE = [];

// Lines that won a cluster but were turned down on review; the next most central line of the cluster stands
// in, so the other clusters' picks don't change
const REJECTED = [
    /prox(y|ies)/i,                             // facts about proxies, which models repeated as answers
];

function random(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
}

function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

function letters(text) {
    return text.replace(/:\w+:/g, '').replace(/[^A-Za-z]/g, '');
}

// A wall of one emoji, a long run of one letter, or the same line three times running
function isSpam(text) {
    if (/(:\w+:)(?:\s*\1){3,}|(\p{Extended_Pictographic})(?:\s*\2){3,}|([A-Za-z!?])\3{9,}/u.test(text)) return true;
    const lines = text.split('\n');
    return lines.some((line, i) => i >= 2 && line && line === lines[i - 1] && line === lines[i - 2]);
}

function measure(lines) {
    let lower = 0, upper = 0, startsUpper = 0, startsLetter = 0, fullStop = 0, shouted = 0;
    for (const line of lines) {
        const plain = line.replace(/:\w+:/g, '');
        for (const c of plain) {
            if (c >= 'a' && c <= 'z') lower++;
            else if (c >= 'A' && c <= 'Z') upper++;
        }
        const first = plain.match(/[A-Za-z]/);
        if (first) {
            startsLetter++;
            if (first[0] <= 'Z') startsUpper++;
        }
        if (/[^.]\.$/.test(plain)) fullStop++;
        const l = letters(line);
        if (l.length >= 3 && l === l.toUpperCase()) shouted++;
    }
    const sorted = lines.map((l) => l.length).sort((a, b) => a - b);
    return {
        lowercaseShare: +(lower / (lower + upper)).toFixed(2),
        linesStartingLowercase: +(1 - startsUpper / startsLetter).toFixed(2),
        linesEndingInFullStop: +(fullStop / lines.length).toFixed(3),
        shoutedLines: +(shouted / lines.length).toFixed(2),
        medianLineLength: sorted[sorted.length >> 1],
    };
}

async function main() {
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    const raw = db.prepare('SELECT text FROM memories').all().map((r) => toShortcodes(r.text));
    const chunks = raw.map(cleanText);
    const lines = chunks.flatMap((c) => c.split('\n'));

    const stats = measure(lines);
    stats.linesPerChunk = chunks.map((c) => c.split('\n').length).sort((a, b) => a - b)[chunks.length >> 1];
    stats.spamShare = +(raw.filter(isSpam).length / raw.length).toFixed(3);

    // Words and emoji he uses most, as the prompt names them
    const counts = {};
    for (const line of lines) {
        for (const word of line.split(/\s+/)) counts[word] = (counts[word] || 0) + 1;
    }
    const emoji = Object.entries(counts)
        .filter(([w]) => /^:\w+:$/.test(w))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([w]) => w.slice(1, -1));

    const seen = new Set();
    const pool = [];
    for (const line of lines) {
        if (line.length < MIN_LENGTH || line.length > MAX_LENGTH) continue;
        if (EXCLUDE.some((re) => re.test(line))) continue;
        if ((line.replace(/:\w+:/g, '').match(/[a-z]{2,}/gi)?.length ?? 0) < 3) continue;
        const key = line.toLowerCase().replace(/[^a-z]/g, '');
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(line);
    }

    const rand = random(SEED);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.length = Math.min(pool.length, POOL);

    const vectors = [];
    for (const line of pool) vectors.push(await embed(line));

    // k-means, then the line nearest each centre stands for its cluster
    let centres = vectors.slice(0, SAMPLES).map((v) => Float32Array.from(v));
    let assignment = new Array(vectors.length).fill(0);
    for (let round = 0; round < 20; round++) {
        assignment = vectors.map((v) => {
            let best = 0;
            for (let k = 1; k < centres.length; k++) if (dot(v, centres[k]) > dot(v, centres[best])) best = k;
            return best;
        });
        centres = centres.map((centre, k) => {
            const sum = new Float32Array(centre.length);
            let n = 0;
            vectors.forEach((v, i) => {
                if (assignment[i] !== k) return;
                n++;
                for (let d = 0; d < sum.length; d++) sum[d] += v[d];
            });
            if (n === 0) return centre;
            const norm = Math.hypot(...sum);
            return sum.map((x) => x / norm);
        });
    }

    const samples = centres.map((centre, k) => {
        let best = -1;
        vectors.forEach((v, i) => {
            if (assignment[i] !== k || REJECTED.some((re) => re.test(pool[i]))) return;
            if (best < 0 || dot(v, centre) > dot(vectors[best], centre)) best = i;
        });
        return best < 0 ? null : pool[best];
    }).filter(Boolean);

    const voice = fs.existsSync(VOICE_PATH) ? JSON.parse(fs.readFileSync(VOICE_PATH, 'utf8')) : {};
    voice.stats = stats;
    voice.emoji = emoji;
    voice.samples = samples;
    voice.examples = voice.examples || [];
    fs.writeFileSync(VOICE_PATH, JSON.stringify(voice, null, 4) + '\n');

    console.log(stats, emoji.join(' '));
    console.log(samples.join('\n'));
}

main();