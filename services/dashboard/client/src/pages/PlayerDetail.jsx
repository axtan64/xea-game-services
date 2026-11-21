import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, describeTold, useApi } from '../api.js';
import { Badge, ErrorText, JoinButton, Loading, MessagingWarning, Notice, PageHead, Person, Stat } from '../components.jsx';
import { useGame } from '../games.jsx';
import { dateTime, duration, money, number, percent, profileUrl, robux, timeAgo } from '../format.js';
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

// What the Join buttons do (server/lib/joinLinks.js)
const JOIN_CITY_TITLE = 'Starts Roblox in the lobby, which sends you on into this city as an invite does';
const JOIN_PLAYER_TITLE = 'Starts Roblox in the lobby, which finds the server they are in and sends you there, as /join does';

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

const nameOf = (profile) => profile?.name || profile?.username || profile?.userId || 'them';

function Passes({ data, run, busy }) {
    if (data.products.length === 0 && data.otherProducts.length === 0) return null;

    const takeBack = (key, name) =>
        window.confirm(`Take ${name} back from them? The backend forgets they had it, so only giving it again undoes this. Robux aren't refunded.`)
        && run(`products/${key}`, { method: 'DELETE' }, `${name} taken back: it goes when they next join.`);

    return (
        <div className="card">
            <div className="card-title">Passes held by the backend</div>
            <p className="hint muted">
                Gifts, the owner's free gifts and passes given here. Taking one back deletes it from the backend: they lose
                it when they next join (a server they're in now keeps it until they leave). A pass bought on Roblox can't be
                taken from here: Roblox owns that, and the game asks Roblox too. One given here shows up at once in the
                server they're in.
            </p>
            <div className="pass-grid">
                {data.products.map((product) => (
                    <div className="pass" key={product.key}>
                        <span>{product.name}</span>
                        {product.owned
                            ? <button className="button small danger" disabled={busy} onClick={() => takeBack(product.key, product.name)}>Take back</button>
                            : <button className="button small green" disabled={busy} onClick={() => run('products', { method: 'POST', body: { key: product.key } }, `${product.name} given.`)}>Give</button>}
                    </div>
                ))}
                {data.otherProducts.map((key) => (
                    <div className="pass" key={key}>
                        <span className="mono" title="Held by the backend, but not one of the passes this dashboard knows">{key}</span>
                        <button className="button small danger" disabled={busy} onClick={() => takeBack(key, key)}>Take back</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// One explosive in stock, with how many to take away (all, unless changed)
function ExplosiveStock({ explosive, run, busy, isPlaying }) {
    const [amount, setAmount] = useState(String(explosive.count));
    const count = Number(amount);
    const isValid = Number.isInteger(count) && count >= 1 && count <= explosive.count;

    function take() {
        if (!window.confirm(`Take ${count} of their ${explosive.count} ${explosive.name}? Only giving them again undoes this. Robux aren't refunded.`)) return;
        run(`explosives/${explosive.key}`, { method: 'DELETE', body: { count } }, `${count} ${explosive.name} taken.`);
    }

    return (
        <div className="pass">
            <span>{explosive.name}: <strong>{number(explosive.count)}</strong></span>
            <span className="tight">
                <input className="input tiny" type="number" min={1} max={explosive.count} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy || isPlaying} />
                <button className="button small danger" disabled={busy || isPlaying || !isValid} onClick={take}>Take away</button>
            </span>
        </div>
    );
}

function Explosives({ data, run, busy }) {
    if (!data.explosives) return null;
    const held = data.explosives.filter((explosive) => explosive.count > 0);

    return (
        <div className="card">
            <div className="card-title">Explosives in stock</div>
            <p className="hint muted">
                Bought or given, not used yet, and kept for good. Taking some away deletes them from the backend; their
                purchase records stay unless you delete those below. Robux aren't refunded.
            </p>
            {data.isPlaying && held.length > 0 && (
                <p className="notice bad">
                    They're playing, or were in the last few minutes: their server saves their stock every minute and would
                    put back anything taken now. Try again once they've been gone a few minutes.
                </p>
            )}
            {held.length === 0 ? <p className="muted">None.</p> : (
                <div className="pass-grid stock-grid">
                    {held.map((explosive) => (
                        <ExplosiveStock key={`${explosive.key}:${explosive.count}`} explosive={explosive} run={run} busy={busy} isPlaying={data.isPlaying} />
                    ))}
                </div>
            )}
        </div>
    );
}

// What deleting a purchase's record can also undo, by what it gave (server/lib/holdings.js describeEffect): `undo`
// is the choice to offer, if any, and `note` what stays either way
function deleteOutcome(purchase) {
    const owner = nameOf(purchase.recipient ?? purchase.buyer);
    const { gave } = purchase;

    switch (gave?.kind) {
        case 'pass':
            return { undo: `Also take the ${gave.passKey} pass back from ${owner}`, note: 'They lose it when they next join.' };
        case 'explosive':
            return { undo: `Also take ${gave.count} ${gave.explosive} from ${owner}'s stock`, note: 'As many as they still have: any already used are gone.' };
        case 'cash':
            return { note: 'The cash went into a city\'s pot and stays there.' };
        case 'boost':
            return { note: 'The city keeps its cash boost.' };
        case 'robloxPass':
            return { note: 'This pass was bought on Roblox, which still says they own it, so the game still gives it them. Refunds are Roblox\'s to give.' };
        default:
            return { note: 'Whatever it gave stays.' };
    }
}

function describeDeleted(result) {
    const back = result?.tookBack;
    if (!back) return 'Purchase record deleted.';
    if (back.pass) return back.had ? `Record deleted, and ${back.pass} taken back: it goes when they next join.` : `Record deleted. They no longer had ${back.pass}.`;
    return back.taken > 0 ? `Record deleted, and ${back.taken} ${back.explosive} taken from their stock.` : `Record deleted. They had no ${back.explosive} left.`;
}

// Asks before deleting a purchase's record, saying what goes, what can be taken back with it and what stays
function DeletePurchase({ purchase, data, run, busy, onClose }) {
    const outcome = deleteOutcome(purchase);
    const [undo, setUndo] = useState(Boolean(outcome.undo));
    const isBlocked = undo && purchase.gave?.kind === 'explosive' && data.isPlaying;
    const product = purchase.productKey ?? purchase.productId;

    function confirm() {
        run(`purchases/${purchase.id}`, { method: 'DELETE', body: { undo } }, describeDeleted).then((ok) => ok && onClose());
    }

    return (
        <div className="confirm-box">
            <div className="card-title">Delete this purchase record?</div>
            <p>
                <span className="mono">{product}</span> · {purchase.isGrant ? 'given free' : robux(purchase.priceRobux)} ·{' '}
                {dateTime(purchase.at)} · bought by {nameOf(purchase.buyer)}{purchase.recipient ? ` for ${nameOf(purchase.recipient)}` : ''}
            </p>
            <p className="hint muted">
                The record leaves the purchase log and the sales totals for good. Robux aren't refunded, and their Robux
                spent stat stays as it is.
            </p>
            {outcome.undo ? (
                <>
                    <label className="check">
                        <input type="checkbox" checked={undo} onChange={(e) => setUndo(e.target.checked)} />
                        {outcome.undo}
                    </label>
                    <p className="hint muted">{undo ? outcome.note : 'Left unticked, only the record goes: they keep what it gave.'}</p>
                </>
            ) : <p className="hint">Only the record goes. {outcome.note}</p>}
            {isBlocked && (
                <p className="notice bad">
                    They're playing, or were in the last few minutes, so their explosives can't be taken now (their server
                    would put them back). Untick it to delete only the record, or try again later.
                </p>
            )}
            <div className="row-line">
                <button className="button danger" disabled={busy || isBlocked} onClick={confirm}>{undo && outcome.undo ? 'Delete and take back' : 'Delete record'}</button>
                <button className="button" disabled={busy} onClick={onClose}>Cancel</button>
            </div>
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
                ? (
                    <div className="row-line">
                        <span>Playing now in <Person profile={data.playing.owner} small />'s city, slot {data.playing.slot}.</span>
                        <JoinButton url={data.playing.joinUrl} label="Join their city" title={JOIN_CITY_TITLE} />
                    </div>
                )
                : <p className="muted">Not in a city now.</p>}
            {!data.canJoin && <p className="hint muted">Join buttons need the game's universe ID: set it on the Games page.</p>}
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
                                    <td>
                                        {slot.isLive ? (
                                            <span className="tight">
                                                <Badge tone="green">Live · {slot.playerCount}/{slot.maxPlayers}</Badge>
                                                <JoinButton url={slot.joinUrl} title={JOIN_CITY_TITLE} />
                                            </span>
                                        ) : null}
                                    </td>
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
    const [deleting, setDeleting] = useState(null);

    // Runs one of the player's actions, says how it went, and reloads the page's data. `done` is what to say, or
    // makes it from the result. Resolves to whether it worked
    async function run(path, options, done) {
        setBusy(true);
        try {
            const result = await api(`/api/games/${game.slug}/players/${userId}/${path}`, options);
            setStatus({ ok: true, message: typeof done === 'function' ? done(result) : describeTold(result, done), path });
            reload();
            return true;
        } catch (err) {
            setStatus({ ok: false, message: err.message, path });
            return false;
        } finally {
            setBusy(false);
        }
    }

    const profile = data?.profile;
    // A purchase's deletion is told in the Purchases card, by the table; everything else at the top
    const isPurchaseStatus = Boolean(status?.path?.startsWith('purchases/'));

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
                        {data.hasCities && (data.playing
                            ? <JoinButton url={data.playing.joinUrl} label="Join their city" title={JOIN_CITY_TITLE} />
                            : <JoinButton url={data.followUrl} label="Join them" title={JOIN_PLAYER_TITLE} />)}
                    </div>
                    <p className="muted">In {game.name}. <Link className="text-link" to="/players">Find someone else</Link></p>

                    <MessagingWarning />
                    <Notice status={isPurchaseStatus ? null : status} />
                    <Standing data={data} run={run} busy={busy} />
                    <Passes data={data} run={run} busy={busy} />
                    <Explosives data={data} run={run} busy={busy} />
                    {data.hasStats ? <Stats stats={data.stats} /> : null}
                    <Cities data={data} />

                    <div className="card">
                        <div className="card-title">Purchases</div>
                        <p className="hint muted">
                            The newest 25 they made or were given. Deleting one removes its record, and can also take back
                            a gift's pass or an explosive purchase's sticks; nothing here refunds Robux.
                        </p>
                        {deleting && (
                            <DeletePurchase key={deleting.id} purchase={deleting} data={data} run={run} busy={busy} onClose={() => setDeleting(null)} />
                        )}
                        <Notice status={isPurchaseStatus ? status : null} />
                        <PurchaseTable purchases={data.purchases} busy={busy} onDelete={setDeleting} />
                    </div>
                </>
            )}
        </div>
    );
}
