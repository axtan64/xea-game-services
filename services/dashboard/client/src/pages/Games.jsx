import { useState } from 'react';
import { api } from '../api.js';
import { Badge, Notice, PageHead } from '../components.jsx';
import { useGame } from '../games.jsx';

function GameCard({ game, onSaved }) {
    const [universeId, setUniverseId] = useState(game.universeId ?? '');
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        try {
            await api(`/api/games/${game.slug}/roblox`, {
                method: 'PUT',
                body: { universeId: universeId.trim() || null, apiKey: apiKey.trim() },
            });
            setApiKey('');
            setStatus({ ok: true, message: 'Saved. It takes effect at once, with no restart.' });
            onSaved();
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSaving(false);
        }
    }

    async function clearKey() {
        if (!window.confirm(`Clear ${game.name}'s Open Cloud key? Global announcements, gifts and live bans stop until a new one is set.`)) return;
        try {
            await api(`/api/games/${game.slug}/roblox/key`, { method: 'DELETE' });
            setStatus({ ok: true, message: 'Key cleared.' });
            onSaved();
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        }
    }

    return (
        <div className="card">
            <div className="row-line">
                <div className="card-title grow">{game.name} <span className="muted mono">{game.slug}</span></div>
                {game.messagingReady ? <Badge tone="green">Can reach live servers</Badge> : <Badge tone="yellow">Can't reach live servers</Badge>}
            </div>
            <form onSubmit={save}>
                <label className="field">
                    <span className="field-label">Universe ID</span>
                    <input className="input" value={universeId} onChange={(e) => setUniverseId(e.target.value)} placeholder="The experience's universe ID" inputMode="numeric" />
                </label>
                <label className="field">
                    <span className="field-label">Open Cloud API key</span>
                    <input
                        className="input"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={game.hasApiKey ? `Set (${game.apiKeyMasked}): leave empty to keep it` : 'Not set'}
                        autoComplete="off"
                    />
                </label>
                <div className="row-line">
                    <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    {game.hasApiKey ? <button className="button" type="button" onClick={clearKey}>Clear key</button> : null}
                </div>
            </form>
            <Notice status={status} />
        </div>
    );
}

export default function Games() {
    const { games, reload, error } = useGame();

    return (
        <div className="page">
            <PageHead title="Games" />
            <p className="muted">
                What each game's cross-server messages (announcements, gifts, kicks, restarts) are published with, and
                for Clean Up The City its bans, which are Roblox's own. Make the key at create.roblox.com, under Open
                Cloud, then API Keys: give it, for the experience, the messaging-service Publish permission and the
                user-restriction Read and Write permissions, and nothing more. It is kept in the backend's database and
                never shown again here.
            </p>
            {error ? <p className="notice bad">{error}</p> : null}
            {games.map((game) => <GameCard key={game.slug} game={game} onSaved={reload} />)}
        </div>
    );
}