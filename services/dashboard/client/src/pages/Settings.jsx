import { useEffect, useState } from 'react';

export default function Settings() {
    const [settings, setSettings] = useState(null);
    const [draft, setDraft] = useState('');
    const [status, setStatus] = useState(null);

    const load = () => fetch('/api/settings').then((r) => r.json()).then(setSettings);

    useEffect(() => { load(); }, []);

    async function rotate(e) {
        e.preventDefault();
        if (!draft) return;

        const res = await fetch('/api/settings/ROBLOX_BOT_COOKIE', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: draft }),
        });

        if (res.ok) {
            setStatus({ ok: true, message: 'Updated - takes effect on the next /funds call or scheduled post, no restart needed.' });
            setDraft('');
            load();
        } else {
            const body = await res.json().catch(() => ({}));
            setStatus({ ok: false, message: body.error || 'Failed to update' });
        }
    }

    return (
        <div className="preview">
            <div className="preview-head"><h1>Settings</h1></div>

            <div className="section-pill">Roblox bot cookie</div>
            {settings && (
                <p className="muted">
                    Current value: {settings.ROBLOX_BOT_COOKIE.set
                        ? <span className="mono">{settings.ROBLOX_BOT_COOKIE.masked}</span>
                        : 'not set'}
                </p>
            )}

            <form onSubmit={rotate}>
                <label className="field">
                    <span className="field-label">New .ROBLOSECURITY cookie</span>
                    <input
                        className="input"
                        type="password"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="_|WARNING:-DO-NOT-SHARE-THIS...."
                    />
                </label>
                <button className="primary" type="submit">Rotate cookie</button>
            </form>

            {status && <p className={status.ok ? 'hint' : 'hint red-text'}>{status.message}</p>}
        </div>
    );
}