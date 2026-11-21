import { useState } from 'react';
import { api, describeTold, useApi } from '../api.js';
import { Badge, ErrorText, GameTopic, IconButton, Loading, Notice, Page, Person } from '../components.jsx';
import { useGame } from '../games.jsx';
import { Icon } from '../icons.jsx';
import { useConfirm } from '../ui.jsx';
import { dateTime, timeAgo } from '../format.js';

export default function Moderation() {
    const { game } = useGame();
    const base = game ? `/api/games/${game.slug}` : null;
    const { data, error, loading, reload } = useApi(base && `${base}/moderation`);
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [newAdmin, setNewAdmin] = useState('');
    const confirm = useConfirm();

    async function act(work, done) {
        setBusy(true);
        try {
            const result = await work();
            setStatus({ ok: true, message: describeTold(result, done) });
            reload();
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setBusy(false);
        }
    }

    async function addAdmin(e) {
        e.preventDefault();
        const query = newAdmin.trim();
        if (!query) return;
        const asked = await confirm({
            title: `Make ${query} an admin`,
            body: `They can run admin commands in every server of ${game.name}.`,
            confirmLabel: 'Make admin',
        });
        if (!asked) return;

        act(async () => {
            const { userId } = await api(`${base}/players/find?q=${encodeURIComponent(query)}`);
            const result = await api(`${base}/players/${userId}/admin`, { method: 'POST' });
            setNewAdmin('');
            return result;
        }, `${query} is now an admin.`);
    }

    return (
        <Page title="Moderation" icon="shield" topic={<GameTopic />} actions={<IconButton icon="refresh" tip="Refresh" onClick={reload} />}>
            <p className="lead">{game?.name}'s admins and bans. To ban or kick someone, open their page from Players.</p>
            <Notice status={status} />
            <ErrorText error={error} />
            {loading && !data ? <Loading /> : null}

            {data && (
                <>
                    <div className="card">
                        <div className="card-title"><Icon name="users" />Admins</div>
                        <p className="hint">The game's owner is always one, and isn't listed: the game knows them from Roblox.</p>
                        {data.admins.length === 0 ? <p className="muted">No one else.</p> : (
                            <ul className="list">
                                {data.admins.map((admin) => (
                                    <li className="list-row" key={admin.profile.userId}>
                                        <Person profile={admin.profile} />
                                        <span className="muted grow">since {timeAgo(admin.since)}</span>
                                        <button
                                            type="button"
                                            className="button small"
                                            disabled={busy}
                                            onClick={() => act(() => api(`${base}/players/${admin.profile.userId}/admin`, { method: 'DELETE' }), 'Admin removed.')}
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <form className="inline-form" onSubmit={addAdmin}>
                            <input className="input" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="Username or user ID" />
                            <button className="button brand" type="submit" disabled={busy || !newAdmin.trim()}>Make admin</button>
                        </form>
                    </div>

                    <div className="card">
                        <div className="card-title"><Icon name="shield" />Bans</div>
                        {data.bansWith === 'roblox' && (
                            <p className="hint">From Roblox's own ban system, which the game and the Creator Hub's Bans page use too.</p>
                        )}
                        {data.banError && <ErrorText error={`Couldn't read the bans from Roblox: ${data.banError}`} />}
                        {data.bans.length === 0 ? <p className="muted">No one is banned.</p> : (
                            <div className="table-wrap">
                                <table className="table">
                                    <thead><tr><th>Player</th><th>Reason</th><th>Banned</th><th>Until</th><th /></tr></thead>
                                    <tbody>
                                        {data.bans.map((ban) => (
                                            <tr key={ban.profile.userId}>
                                                <td><Person profile={ban.profile} small /></td>
                                                <td>{ban.banReason ?? <span className="muted">none given</span>}</td>
                                                <td className="nowrap" data-tip={dateTime(ban.bannedAt)}>{timeAgo(ban.bannedAt)}</td>
                                                <td>
                                                    {ban.isBanned
                                                        ? (ban.banExpiresAt ? dateTime(ban.banExpiresAt) : 'For good')
                                                        : <Badge>Ran out</Badge>}
                                                </td>
                                                <td className="right">
                                                    <button
                                                        type="button"
                                                        className="button small"
                                                        disabled={busy}
                                                        onClick={() => act(() => api(`${base}/players/${ban.profile.userId}/ban`, { method: 'DELETE' }), 'Unbanned.')}
                                                    >
                                                        {ban.isBanned ? 'Unban' : 'Clear'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </Page>
    );
}