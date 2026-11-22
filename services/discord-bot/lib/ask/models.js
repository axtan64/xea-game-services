// The free chat models /ask can use, (tried in order)

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT = 30000;
const TEMPERATURE = 0.9;

// Per-model request options
const OPTIONS = {
    'qwen/qwen3.8-27b': { reasoning_effort: 'none', max_completion_tokens: 1000 },
    'openai/gpt-oss-120b': { reasoning_effort: 'low', include_reasoning: false, max_completion_tokens: 2500 },
    'openai/gpt-oss-20b': { reasoning_effort: 'low', include_reasoning: false, max_completion_tokens: 2500 },
};
const DEFAULT_OPTIONS = { max_tokens: 1000 };   // room for a wall of spam

const MAIN_MODEL = 'qwen/qwen3.8-27b';
const BACKUP_MODEL = 'openai/gpt-oss-120b';

// Answers that mean "not now" rather than "broken" (aka rate limited)
const BUSY_STATUSES = new Set([429, 498, 500, 502, 503, 504]);

class BusyError extends Error {}

function providers() {
    const list = [];
    if (process.env.GROQ_API_KEY) {
        const key = process.env.GROQ_API_KEY;
        const main = process.env.ASK_MODEL || MAIN_MODEL;
        list.push({ name: 'groq', url: GROQ_URL, key, model: main });
        if (BACKUP_MODEL !== main) list.push({ name: 'groq', url: GROQ_URL, key, model: BACKUP_MODEL });
    }
    const { ASK_FALLBACK_URL: url, ASK_FALLBACK_API_KEY: key, ASK_FALLBACK_MODEL: model } = process.env;
    if (url && key && model) list.push({ name: 'fallback', url, key, model });
    return list;
}

async function request(provider, messages) {
    const response = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
        body: JSON.stringify({
            model: provider.model,
            messages,
            temperature: TEMPERATURE,
            ...(OPTIONS[provider.model] || DEFAULT_OPTIONS),
        }),
        signal: AbortSignal.timeout(TIMEOUT),
    });
    const data = await response.json().catch(() => ({}));
    const retryAfter = Number(response.headers.get('retry-after')) || 0;
    return { status: response.status, ok: response.ok, data, retryAfter };
}

/**
 * Asks each provider in turn until one answers.
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<{ text: string, provider: string, model: string, usage?: object }>}
 * @throws {BusyError} when every provider is rate limited or unavailable
 * @throws {Error} when one refused the request outright (bad key, bad request) and none answered
 */
async function complete(messages) {
    const list = providers();
    if (list.length === 0) throw new Error('no chat provider configured (GROQ_API_KEY)');

    let refusal = null;
    for (const provider of list) {
        const label = `${provider.name} ${provider.model}`;
        let result;
        try {
            result = await request(provider, messages);
        } catch (err) {
            console.warn(`[ask] ${label} unreachable: ${err.name}`);
            continue;
        }

        const text = result.data.choices?.[0]?.message?.content?.trim();
        if (result.ok && text) {
            return { text, provider: provider.name, model: provider.model, usage: result.data.usage };
        }
        if (result.ok || BUSY_STATUSES.has(result.status)) {
            // An empty answer (gpt-oss reasoning past its limit) is worth trying elsewhere too
            console.warn(`[ask] ${label} busy or empty: ${result.status} ${result.data.error?.code ?? ''}`);
            continue;
        }

        console.error(`[ask] ${label} refused: ${result.status} ${result.data.error?.message ?? ''}`);
        refusal = new Error(`chat provider refused the request (${result.status})`);
    }

    throw refusal ?? new BusyError('every chat provider is busy');
}

/**
 * One request to one Groq model, for tools/compare-ask.js.
 * @returns {Promise<{ status: number, ok: boolean, data: object, retryAfter: number }>}
 */
function requestGroq(model, messages) {
    return request({ name: 'groq', url: GROQ_URL, key: process.env.GROQ_API_KEY, model }, messages);
}

module.exports = { complete, requestGroq, BusyError, MAIN_MODEL, BACKUP_MODEL };