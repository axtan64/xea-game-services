import { useCallback, useEffect, useState } from 'react';

// Calls the dashboard's API, throwing an Error in the server's own words when it refuses
export async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
}

// Loads `path` (nothing while it is null) and again on reload(): { data, error, loading, reload }. What was loaded stays shown while it reloads, so a page doesn't blink
export function useApi(path) {
    const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        if (!path) return undefined;

        let cancelled = false;
        setState((previous) => ({ ...previous, loading: true }));
        api(path)
            .then((data) => !cancelled && setState({ data, error: null, loading: false }))
            .catch((err) => !cancelled && setState((previous) => ({ ...previous, error: err.message, loading: false })));

        return () => { cancelled = true; };
    }, [path, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);
    return { ...state, reload };
}

// What a change that also told live servers says: whether they heard, since the change stands either way
export function describeTold(result, done) {
    if (!result || result.told === undefined) return done;
    if (result.told) return `${done} Live servers were told.`;
    return `${done} Live servers weren't told (${result.toldError}), so it applies when they next join.`;
}