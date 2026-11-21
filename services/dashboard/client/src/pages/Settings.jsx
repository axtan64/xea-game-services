import { useEffect, useState } from 'react';
import { Notice, Page } from '../components.jsx';
import { Icon } from '../icons.jsx';

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
        <Page title="Settings" icon="sliders" topic="Every game">
            <div className="card">
                <div className="card-title"><Icon name="key" />Roblox bot cookie</div>
                {settings && (
                    <p className="hint">
                        Current value: {settings.ROBLOX_BOT_COOKIE.set
                            ? <span className="code">{settings.ROBLOX_BOT_COOKIE.masked}</span>
                            : 'not set'}
                    </p>
                )}
                <form className="form-stack" onSubmit={rotate}>
                    <label className="field">
                        <span className="field-label">New .ROBLOSECURITY cookie</span>
                        <input
                            className="input"
                            type="password"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="_|WARNING:-DO-NOT-SHARE-THIS...."
                            autoComplete="off"
                        />
                    </label>
                    <div className="row-line">
                        <button className="button brand" type="submit" disabled={!draft}>Rotate cookie</button>
                    </div>
                </form>
                <Notice status={status} />
            </div>
        </Page>
    );
}
