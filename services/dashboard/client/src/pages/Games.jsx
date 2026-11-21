import { useState } from 'react';
import { api } from '../api.js';
import { Badge, ErrorText, Notice, Page } from '../components.jsx';
import { acronym, useGame } from '../games.jsx';
import { useConfirm } from '../ui.jsx';

function GameCard({ game, onSaved }) {
    const [universeId, setUniverseId] = useState(game.universeId ?? '');
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

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
        const asked = await confirm({
            title: `Clear ${game.name}'s key`,
            body: 'Global announcements, gifts and live bans stop until a new Open Cloud key is set.',
            confirmLabel: 'Clear key',
            danger: true,
        });
        if (!asked) return;
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
                <span className="nav-game-icon game-icon">{acronym(game.name)}</span>
                <div className="card-title grow">{game.name} <span className="code">{game.slug}</span></div>
                {game.messagingReady ? <Badge tone="green">Can reach live servers</Badge> : <Badge tone="yellow">Can't reach live servers</Badge>}
            </div>
            <form className="form-stack" onSubmit={save}>
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
                    <button className="button brand" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                    {game.hasApiKey ? <button className="button link" type="button" onClick={clearKey}>Clear key</button> : null}
                </div>
            </form>
            <Notice status={status} />
        </div>
    );
}

export default function Games() {
    const { games, reload, error } = useGame();

    return (
        <Page title="Games" icon="gamepad" topic="Every game">
            <p className="lead">
                What each game's cross-server messages (announcements, gifts, kicks, restarts) are published with, and
                for Clean Up The City its bans, which are Roblox's own. Make the key at create.roblox.com, under Open
                Cloud, then API Keys: give it, for the experience, the messaging-service Publish permission and the
                user-restriction Read and Write permissions, and nothing more. It is kept in the backend's database and
                never shown again here.
            </p>
            <ErrorText error={error} />
            {games.map((game) => <GameCard key={game.slug} game={game} onSaved={reload} />)}
        </Page>
    );
}