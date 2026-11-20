import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, describeTold, useApi } from '../api.js';
import { Badge, ErrorText, Loading, MessagingWarning, Notice, PageHead, Person, Stat } from '../components.jsx';
import { useGame } from '../games.jsx';
import { dateTime, duration, money, number, percent, profileUrl, timeAgo } from '../format.js';
import { PurchaseTable } from './Purchases.jsx';
import { PlayerSearch } from './Players.jsx';

const BAN_LENGTHS = [
    { label: '1 day', days: 1 },
    { label: '3 days', days: 3 },
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: 'For good', days: null },
];
// The picker's first choice: 7 days
const DEFAULT_BAN_LENGTH = '2';

const count = (table) => (table && typeof table === 'object' ? Object.values(table).filter(Boolean).length : 0);

function Standing({ data, run, busy }) {
    const { membership } = data;
    const [banReason, setBanReason] = useState('');
    const [banLength, setBanLength] = useState(DEFAULT_BAN_LENGTH);
    const [kickReason, setKickReason] = useState('');

    function ban(e) {
        e.preventDefault();
        const length = BAN_LENGTHS[Number(banLength)];
        const alts = membership.bansWith === 'roblox' ? ' Roblox bans their known alt accounts too.' : '';
        if (!window.confirm(`Ban them ${length.days ? `for ${length.label}` : 'for good'}? They're kicked from any server they're in.${alts}`)) return;
        run('ban', { method: 'POST', body: { reason: banReason, days: length.days } }, 'Banned.').then((ok) => ok && setBanReason(''));
    }

    function kick(e) {
        e.preventDefault();
        run('kick', { method: 'POST', body: { reason: kickReason } }, 'Kicked, if they were in a live server.').then((ok) => ok && setKickReason(''));
    }

    return (
        <div className="card">
            <div className="card-title">Standing</div>
            {membership.bansWith === 'roblox' && (
                <p className="hint muted">
                    Bans use Roblox's own ban system, as /ban in the game does: they show on the Creator Hub's Bans page
                    too, and Roblox shows the reason when they try to join.
                </p>
            )}
            {membership.banError && <p className="notice bad">Couldn't ask Roblox whether they're banned: {membership.banError}</p>}

            {membership.isBanned ? (
                <div className="row-line">
                    <Badge tone="red">Banned</Badge>
                    <span>
                        “{membership.banReason}” · since {dateTime(membership.bannedAt)} ·{' '}
                        {membership.banExpiresAt ? `until ${dateTime(membership.banExpiresAt)}` : 'for good'}
                    </span>
                    <button className="button" disabled={busy} onClick={() => run('ban', { method: 'DELETE' }, 'Unbanned.')}>Unban</button>
                </div>
            ) : (
                <form className="inline-form" onSubmit={ban}>
                    <input className="input" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Ban reason (they're shown it)" maxLength={200} />
                    <select className="input narrow" value={banLength} onChange={(e) => setBanLength(e.target.value)}>
                        {BAN_LENGTHS.map((length, index) => <option key={length.label} value={index}>{length.label}</option>)}
                    </select>
                    <button className="button danger" type="submit" disabled={busy || !banReason.trim()}>Ban</button>
                </form>
            )}

            <form className="inline-form" onSubmit={kick}>
                <input className="input" value={kickReason} onChange={(e) => setKickReason(e.target.value)} placeholder="Kick reason (they're shown it)" maxLength={200} />
                <button className="button danger" type="submit" disabled={busy || !kickReason.trim()}>Kick</button>
            </form>
            <p className="hint muted">A kick removes them from the server they're in; they may come straight back.</p>

            <div className="row-line">
                {membership.isAdmin ? <Badge tone="green">Admin</Badge> : <span className="muted">Not an admin.</span>}
                {membership.isAdmin
                    ? <button className="button" disabled={busy} onClick={() => run('admin', { method: 'DELETE' }, 'No longer an admin.')}>Remove admin</button>
                    : <button className="button" disabled={busy} onClick={() => window.confirm('Make them an admin? They can run admin commands in every server.') && run('admin', { method: 'POST' }, 'Now an admin.')}>Make admin</button>}
            </div>
        </div>
    );
}

function Passes({ data, run, busy }) {
    if (data.products.length === 0 && data.otherProducts.length === 0) return null;

    return (
        <div className="card">
            <div className="card-title">Passes given through the backend</div>
            <p className="hint muted">
                Gifts and grants. A pass bought on Roblox stays theirs whatever this says: the game asks Roblox too. One
                given here shows up at once in the server they're in; one taken back goes when they next join.
            </p>
            <div className="pass-grid">
                {data.products.map((product) => (
                    <div className="pass" key={product.key}>
                        <span>{product.name}</span>
                        {product.owned
                            ? <button className="button small" disabled={busy} onClick={() => window.confirm(`Take ${product.name} back?`) && run(`products/${product.key}`, { method: 'DELETE' }, `${product.name} taken back.`)}>Take back</button>
                            : <button className="button small green" disabled={busy} onClick={() => run('products', { method: 'POST', body: { key: product.key } }, `${product.name} given.`)}>Give</button>}
                    </div>
                ))}
            </div>
            {data.otherProducts.length > 0 && (
                <p className="hint muted">Also owned: <span className="mono">{data.otherProducts.join(', ')}</span></p>
            )}
        </div>
    );
}

function Stats({ stats }) {
    if (!stats) return <div className="card"><div className="card-title">Stats</div><p className="muted">They have never played this game.</p></div>;

    return (
        <div className="card">
            <div className="card-title">Stats</div>
            <div className="stats">
                <Stat label="Time played" value={duration(stats.timePlayed)} />
                {stats.litterPickedUp !== undefined && <Stat label="Litter picked up" value={number(stats.litterPickedUp)} />}
                {stats.tilesCleaned !== undefined && <Stat label="Tiles cleaned" value={number(stats.tilesCleaned)} />}
                {stats.cashEarned !== undefined && <Stat label="Cash earned" value={money(stats.cashEarned)} />}
                {stats.easterEggs !== undefined && <Stat label="Easter eggs found" value={number(count(stats.easterEggs))} />}
                {stats.dailies?.streak !== undefined && <Stat label="Daily streak" value={number(stats.dailies.streak)} sub={`best ${number(stats.dailies.best ?? 0)}`} />}
            </div>
            <p className="hint muted">First played {dateTime(stats.createdAt)} · last saved {timeAgo(stats.updatedAt)}</p>
            <details className="raw">
                <summary>Everything saved</summary>
                <pre className="mono">{JSON.stringify(stats, null, 2)}</pre>
            </details>
        </div>
    );
}

function Cities({ data }) {
    if (!data.hasCities) return null;

    return (
        <div className="card">
            <div className="card-title">Cities</div>
            {data.playing
                ? <p>Playing now in <Person profile={data.playing.owner} small />'s city, slot {data.playing.slot}.</p>
                : <p className="muted">Not in a city now.</p>}
            {data.slots.length === 0 ? <p className="muted">No save slots.</p> : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th>Slot</th><th>Clean</th><th>Cash</th><th>Played</th><th>Sharing</th><th>Last played</th><th /></tr>
                        </thead>
                        <tbody>
                            {data.slots.map((slot) => (
                                <tr key={slot.slot}>
                                    <td>{slot.slot}</td>
                                    <td>{percent(slot.cleanShare)}</td>
                                    <td>{money(slot.cash)}</td>
                                    <td>{duration(slot.playTime)}{slot.finishedIn != null ? <span className="muted"> · finished in {duration(slot.finishedIn)}</span> : null}</td>
                                    <td>{slot.access}{slot.allowAway ? ', while away' : ''}{slot.members ? <span className="muted"> · {slot.members} invited</span> : null}</td>
                                    <td title={dateTime(slot.lastPlayedAt)}>{timeAgo(slot.lastPlayedAt)}</td>
                                    <td>{slot.isLive ? <Badge tone="green">Live · {slot.playerCount}/{slot.maxPlayers}</Badge> : null}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function PlayerDetail() {
    const { userId } = useParams();
    const { game } = useGame();
    const { data, error, loading, reload } = useApi(game ? `/api/games/${game.slug}/players/${userId}` : null);
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);

    // Runs one of the player's actions, says how it went, and reloads the page's data. Resolves to whether it worked
    async function run(path, options, done) {
        setBusy(true);
        try {
            const result = await api(`/api/games/${game.slug}/players/${userId}/${path}`, options);
            setStatus({ ok: true, message: describeTold(result, done) });
            reload();
            return true;
        } catch (err) {
            setStatus({ ok: false, message: err.message });
            return false;
        } finally {
            setBusy(false);
        }
    }

    const profile = data?.profile;

    return (
        <div className="page">
            <PageHead title="Player">
                <PlayerSearch />
            </PageHead>
            <ErrorText error={error} />
            {loading && !data ? <Loading what="their page" /> : null}

            {data && (
                <>
                    <div className="player-head">
                        <Person profile={profile} plain sub={<>@{profile.username ?? '?'} · <span className="mono">{userId}</span></>} />
                        <div className="badges">
                            {data.membership.isBanned && <Badge tone="red">Banned</Badge>}
                            {data.membership.isAdmin && <Badge tone="green">Admin</Badge>}
                            {data.playing && <Badge tone="blurple">In a city</Badge>}
                        </div>
                        <a className="text-link" href={profileUrl(userId)} target="_blank" rel="noreferrer">Roblox profile ↗</a>
                    </div>
                    <p className="muted">In {game.name}. <Link className="text-link" to="/players">Find someone else</Link></p>

                    <MessagingWarning />
                    <Notice status={status} />
                    <Standing data={data} run={run} busy={busy} />
                    <Passes data={data} run={run} busy={busy} />
                    {data.hasStats ? <Stats stats={data.stats} /> : null}
                    <Cities data={data} />

                    <div className="card">
                        <div className="card-title">Purchases</div>
                        <PurchaseTable purchases={data.purchases} />
                    </div>
                </>
            )}
        </div>
    );
}
