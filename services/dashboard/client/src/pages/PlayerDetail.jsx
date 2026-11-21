import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, describeTold, useApi } from '../api.js';
import {
    Avatar, Badge, Callout, ErrorText, GameTopic, JoinButton, Loading, MessagingWarning, Notice, Page, Person, Stat,
} from '../components.jsx';
import { acronym, useGame } from '../games.jsx';
import { Icon } from '../icons.jsx';
import { CopyButton, Modal, Select, useConfirm } from '../ui.jsx';
import { dateTime, duration, money, number, percent, profileUrl, robux, shortDate, timeAgo } from '../format.js';
import { PurchaseTable } from './Purchases.jsx';
import { PlayerSearch } from './Players.jsx';

const BAN_LENGTHS = [
    { label: '1 day', days: 1 },
    { label: '3 days', days: 3 },
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: 'For good', days: null },
];
const BAN_OPTIONS = BAN_LENGTHS.map((length, index) => ({ value: index, label: length.label }));
// The picker's first choice: 7 days
const DEFAULT_BAN_LENGTH = 2;
// How lately their server must have saved them for the activity card to say when (a player seen only in a city's
// list of players may not have been saved for a while)
const RECENT_SAVE_MS = 5 * 60 * 1000;

const count = (table) => (table && typeof table === 'object' ? Object.values(table).filter(Boolean).length : 0);
const nameOf = (profile) => profile?.name || profile?.username || profile?.userId || 'them';

// What the Join buttons do (server/lib/joinLinks.js)
const JOIN_CITY_TIP = 'Starts Roblox in the lobby, which sends you on into this city as an invite does';
const JOIN_PLAYER_TIP = 'Starts Roblox in the lobby, which finds the server they are in and sends you there, as /join does';

// Where they are, as Discord shows what someone is playing, with a Join button to follow them there
function Activity({ data, userId }) {
    const { game } = useGame();
    const { playing, presence } = data;
    const joinUrl = playing ? playing.joinUrl : data.followUrl;
    const savedLately = presence.lastSeenAt && Date.now() - new Date(presence.lastSeenAt).getTime() < RECENT_SAVE_MS;

    return (
        <div className="activity">
            <div className="activity-heading">In the game now</div>
            <div className="activity-row">
                <span className="activity-icon">{acronym(game?.name)}</span>
                <div className="activity-text">
                    <span className="activity-name">{game?.name}</span>
                    {playing ? (
                        playing.ownerId === userId
                            ? <span>In their own city, slot {playing.slot}</span>
                            : <span>In <Person profile={playing.owner} small />'s city, slot {playing.slot}</span>
                    ) : <span>In the lobby, or a city whose server hasn't listed them yet</span>}
                    {savedLately ? <span className="activity-time">Their server saved them {timeAgo(presence.lastSeenAt)}</span> : null}
                </div>
                <span className="activity-join">
                    {joinUrl
                        ? <JoinButton url={joinUrl} label={playing ? 'Join their city' : 'Join them'} tip={playing ? JOIN_CITY_TIP : JOIN_PLAYER_TIP} />
                        : <span className="hint">Joining needs the game's universe ID (Games page).</span>}
                </span>
            </div>
        </div>
    );
}

// Their headshot over a banner, names, standing and where they are
function ProfileCard({ data, userId }) {
    const { profile, presence, membership, stats } = data;
    const inGame = Boolean(presence?.inGame);
    let statusTip = null;
    if (presence) statusTip = inGame ? 'In the game now' : 'Not in the game';

    return (
        <section className="profile">
            <div className="profile-banner">{profile.picture ? <img src={profile.picture} alt="" /> : null}</div>
            <div className="profile-top">
                <Avatar profile={profile} size={80} status={presence ? (inGame ? 'online' : 'offline') : null} pulse statusTip={statusTip} />
                <div className="profile-actions">
                    <a className="button small" href={profileUrl(userId)} target="_blank" rel="noreferrer">
                        <Icon name="external" size={16} />
                        Roblox profile
                    </a>
                </div>
            </div>
            <div className="profile-body">
                <div>
                    <div className="profile-name">{nameOf(profile)}</div>
                    <div className="profile-username">@{profile.username ?? '?'}</div>
                </div>
                {presence && !inGame ? (
                    <div className="presence-line">
                        <span className="status-dot offline" />
                        {presence.lastSeenAt ? `Not in the game · last saved by it ${timeAgo(presence.lastSeenAt)}` : 'Not in the game · has never played'}
                    </div>
                ) : null}
                {(membership.isBanned || membership.isAdmin) && (
                    <div className="badges">
                        {membership.isBanned && <Badge tone="red">Banned</Badge>}
                        {membership.isAdmin && <Badge tone="green">Admin</Badge>}
                    </div>
                )}
                {inGame ? <Activity data={data} userId={userId} /> : null}
                <div className="profile-meta">
                    <div>
                        <div className="meta-label">User ID</div>
                        <div className="meta-value"><span className="mono">{userId}</span><CopyButton text={userId} tip="Copy user ID" /></div>
                    </div>
                    <div>
                        <div className="meta-label">First played</div>
                        <div className="meta-value" data-tip={stats ? dateTime(stats.createdAt) : undefined}>{stats ? shortDate(stats.createdAt) : 'Never'}</div>
                    </div>
                    {stats ? (
                        <div>
                            <div className="meta-label">Last saved</div>
                            <div className="meta-value" data-tip={dateTime(stats.updatedAt)}>{timeAgo(stats.updatedAt)}</div>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

function Standing({ data, run, busy }) {
    const confirm = useConfirm();
    const { membership, presence, profile } = data;
    const [banReason, setBanReason] = useState('');
    const [banLength, setBanLength] = useState(DEFAULT_BAN_LENGTH);
    const [kickReason, setKickReason] = useState('');
    // Kicking needs them in a server. A game that can't tell where players are always offers it
    const canKick = !presence || presence.inGame;

    async function ban(e) {
        e.preventDefault();
        const length = BAN_LENGTHS[banLength];
        const asked = await confirm({
            title: `Ban ${nameOf(profile)}`,
            body: (
                <>
                    <p>
                        Ban them {length.days ? `for ${length.label}` : 'for good'}? They're kicked from any server they're in
                        and shown the reason: “{banReason.trim()}”.
                    </p>
                    {membership.bansWith === 'roblox' ? <p className="hint">Roblox bans their known alt accounts too.</p> : null}
                </>
            ),
            confirmLabel: 'Ban',
            danger: true,
        });
        if (!asked) return;
        run('ban', { method: 'POST', body: { reason: banReason, days: length.days } }, 'Banned.').then((ok) => ok && setBanReason(''));
    }

    function kick(e) {
        e.preventDefault();
        run('kick', { method: 'POST', body: { reason: kickReason } }, 'Kicked, if they were in a live server.').then((ok) => ok && setKickReason(''));
    }

    async function makeAdmin() {
        const asked = await confirm({
            title: `Make ${nameOf(profile)} an admin`,
            body: 'They can run admin commands in every server of this game.',
            confirmLabel: 'Make admin',
        });
        if (asked) run('admin', { method: 'POST' }, 'Now an admin.');
    }

    return (
        <div className="card">
            <div className="card-title"><Icon name="shield" />Standing</div>
            {membership.bansWith === 'roblox' && (
                <p className="hint">
                    Bans use Roblox's own ban system, as /ban in the game does: they show on the Creator Hub's Bans page
                    too, and Roblox shows the reason when they try to join.
                </p>
            )}
            {membership.banError && <Callout tone="bad">Couldn't ask Roblox whether they're banned: {membership.banError}</Callout>}

            {membership.isBanned ? (
                <div className="row-line">
                    <Badge tone="red">Banned</Badge>
                    <span className="grow">
                        “{membership.banReason}” · since {dateTime(membership.bannedAt)} ·{' '}
                        {membership.banExpiresAt ? `until ${dateTime(membership.banExpiresAt)}` : 'for good'}
                    </span>
                    <button type="button" className="button small" disabled={busy} onClick={() => run('ban', { method: 'DELETE' }, 'Unbanned.')}>Unban</button>
                </div>
            ) : (
                <form className="inline-form" onSubmit={ban}>
                    <input className="input" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Ban reason (they're shown it)" maxLength={200} />
                    <Select value={banLength} options={BAN_OPTIONS} onChange={setBanLength} ariaLabel="Ban length" />
                    <button className="button danger" type="submit" disabled={busy || !banReason.trim()}>Ban</button>
                </form>
            )}

            {canKick ? (
                <>
                    <form className="inline-form" onSubmit={kick}>
                        <input className="input" value={kickReason} onChange={(e) => setKickReason(e.target.value)} placeholder="Kick reason (they're shown it)" maxLength={200} />
                        <button className="button danger" type="submit" disabled={busy || !kickReason.trim()}>Kick</button>
                    </form>
                    <p className="hint">A kick removes them from the server they're in; they may come straight back.</p>
                </>
            ) : <p className="hint">Kicking shows here while they're in the game.</p>}

            <div className="row-line">
                {membership.isAdmin ? <Badge tone="green">Admin</Badge> : <span className="muted">Not an admin.</span>}
                {membership.isAdmin
                    ? <button type="button" className="button small" disabled={busy} onClick={() => run('admin', { method: 'DELETE' }, 'No longer an admin.')}>Remove admin</button>
                    : <button type="button" className="button small" disabled={busy} onClick={makeAdmin}>Make admin</button>}
            </div>
        </div>
    );
}

function Passes({ data, run, busy }) {
    const confirm = useConfirm();
    if (data.products.length === 0 && data.otherProducts.length === 0) return null;

    async function takeBack(key, name) {
        const asked = await confirm({
            title: `Take back ${name}`,
            body: 'The backend forgets they had it, so only giving it again undoes this. They lose it when they next join. Robux aren\'t refunded.',
            confirmLabel: 'Take back',
            danger: true,
        });
        if (asked) run(`products/${key}`, { method: 'DELETE' }, `${name} taken back: it goes when they next join.`);
    }

    return (
        <div className="card">
            <div className="card-title"><Icon name="gift" />Passes held by the backend</div>
            <p className="hint">
                Gifts, the owner's free gifts and passes given here. Taking one back deletes it from the backend: they lose
                it when they next join (a server they're in now keeps it until they leave). A pass bought on Roblox can't be
                taken from here: Roblox owns that, and the game asks Roblox too. One given here shows up at once in the
                server they're in.
            </p>
            <div className="pass-grid">
                {data.products.map((product) => (
                    <div className={`pass ${product.owned ? 'owned' : ''}`} key={product.key}>
                        <span className="pass-name">
                            <Icon name={product.owned ? 'checkCircle' : 'gift'} size={18} />
                            {product.name}
                        </span>
                        {product.owned
                            ? <button type="button" className="button small danger" disabled={busy} onClick={() => takeBack(product.key, product.name)}>Take back</button>
                            : <button type="button" className="button small green" disabled={busy} onClick={() => run('products', { method: 'POST', body: { key: product.key } }, `${product.name} given.`)}>Give</button>}
                    </div>
                ))}
                {data.otherProducts.map((key) => (
                    <div className="pass owned" key={key}>
                        <span className="pass-name" data-tip="Held by the backend, but not one of the passes this dashboard knows">
                            <Icon name="checkCircle" size={18} />
                            <span className="code">{key}</span>
                        </span>
                        <button type="button" className="button small danger" disabled={busy} onClick={() => takeBack(key, key)}>Take back</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// One explosive in stock, with how many to take away (all, unless changed)
function ExplosiveStock({ explosive, run, busy, isPlaying }) {
    const confirm = useConfirm();
    const [amount, setAmount] = useState(String(explosive.count));
    const taken = Number(amount);
    const isValid = Number.isInteger(taken) && taken >= 1 && taken <= explosive.count;

    async function take() {
        const asked = await confirm({
            title: `Take away ${explosive.name}`,
            body: `Take ${taken} of their ${explosive.count} ${explosive.name}? Only giving them again undoes this. Robux aren't refunded.`,
            confirmLabel: 'Take away',
            danger: true,
        });
        if (asked) run(`explosives/${explosive.key}`, { method: 'DELETE', body: { count: taken } }, `${taken} ${explosive.name} taken.`);
    }

    return (
        <div className="pass">
            <span className="pass-name"><Icon name="bomb" size={18} />{explosive.name}: <strong>{number(explosive.count)}</strong></span>
            <span className="tight">
                <input className="input tiny" type="number" min={1} max={explosive.count} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy || isPlaying} aria-label={`How many ${explosive.name} to take`} />
                <button type="button" className="button small danger" disabled={busy || isPlaying || !isValid} onClick={take}>Take away</button>
            </span>
        </div>
    );
}

function Explosives({ data, run, busy }) {
    if (!data.explosives) return null;
    const held = data.explosives.filter((explosive) => explosive.count > 0);

    return (
        <div className="card">
            <div className="card-title"><Icon name="bomb" />Explosives in stock</div>
            <p className="hint">
                Bought or given, not used yet, and kept for good. Taking some away deletes them from the backend; their
                purchase records stay unless you delete those below. Robux aren't refunded.
            </p>
            {data.isPlaying && held.length > 0 && (
                <Callout tone="warn">
                    They're in the game, or were in the last few minutes: their server saves their stock every minute and
                    would put back anything taken now. Try again once they've been gone a few minutes.
                </Callout>
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
    const close = () => !busy && onClose();

    function confirmDelete() {
        run(`purchases/${purchase.id}`, { method: 'DELETE', body: { undo } }, describeDeleted).then((ok) => ok && onClose());
    }

    return (
        <Modal
            title="Delete purchase record"
            onClose={close}
            footer={(
                <>
                    <button type="button" className="button link" disabled={busy} onClick={close}>Cancel</button>
                    <button type="button" className="button danger" disabled={busy || isBlocked} onClick={confirmDelete} autoFocus>
                        {undo && outcome.undo ? 'Delete and take back' : 'Delete record'}
                    </button>
                </>
            )}
        >
            <div className="modal-facts">
                <span className="code">{product}</span> · {purchase.isGrant ? 'given free' : robux(purchase.priceRobux)} · {dateTime(purchase.at)}
                <br />
                Bought by {nameOf(purchase.buyer)}{purchase.recipient ? ` for ${nameOf(purchase.recipient)}` : ''}
            </div>
            <p className="hint">
                The record leaves the purchase log and the sales totals for good. Robux aren't refunded, and their Robux
                spent stat stays as it is.
            </p>
            {outcome.undo ? (
                <>
                    <label className="check">
                        <input type="checkbox" checked={undo} onChange={(e) => setUndo(e.target.checked)} />
                        {outcome.undo}
                    </label>
                    <p className="hint">{undo ? outcome.note : 'Left unticked, only the record goes: they keep what it gave.'}</p>
                </>
            ) : <p className="hint">Only the record goes. {outcome.note}</p>}
            {isBlocked && (
                <Callout tone="bad">
                    They're in the game, or were in the last few minutes, so their explosives can't be taken now (their
                    server would put them back). Untick it to delete only the record, or try again later.
                </Callout>
            )}
        </Modal>
    );
}

function Stats({ stats }) {
    if (!stats) {
        return (
            <div className="card">
                <div className="card-title"><Icon name="chart" />Stats</div>
                <p className="muted">They have never played this game.</p>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-title"><Icon name="chart" />Stats</div>
            <div className="stats">
                <Stat label="Time played" value={duration(stats.timePlayed)} />
                {stats.litterPickedUp !== undefined && <Stat label="Litter picked up" value={number(stats.litterPickedUp)} />}
                {stats.tilesCleaned !== undefined && <Stat label="Tiles cleaned" value={number(stats.tilesCleaned)} />}
                {stats.cashEarned !== undefined && <Stat label="Cash earned" value={money(stats.cashEarned)} />}
                {stats.easterEggs !== undefined && <Stat label="Easter eggs found" value={number(count(stats.easterEggs))} />}
                {stats.dailies?.streak !== undefined && <Stat label="Daily streak" value={number(stats.dailies.streak)} sub={`best ${number(stats.dailies.best ?? 0)}`} />}
            </div>
            <details className="raw">
                <summary><Icon name="chevronDown" size={16} />Everything saved</summary>
                <pre>{JSON.stringify(stats, null, 2)}</pre>
            </details>
        </div>
    );
}

function Cities({ data }) {
    if (!data.hasCities) return null;

    return (
        <div className="card">
            <div className="card-title"><Icon name="building" />Their cities</div>
            {!data.canJoin && <p className="hint">Join buttons need the game's universe ID: set it on the Games page.</p>}
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
                                    <td className="nowrap" data-tip={dateTime(slot.lastPlayedAt)}>{timeAgo(slot.lastPlayedAt)}</td>
                                    <td className="right">
                                        {slot.isLive ? (
                                            <span className="tight">
                                                <Badge tone="green">Live · {slot.playerCount}/{slot.maxPlayers}</Badge>
                                                <JoinButton url={slot.joinUrl} tip={JOIN_CITY_TIP} />
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

    // Another player's page, opened from the search, starts with nothing said
    useEffect(() => {
        setStatus(null);
        setDeleting(null);
    }, [userId]);

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

    // A purchase's deletion is told in the Purchases card, by the table; everything else at the top
    const isPurchaseStatus = Boolean(status?.path?.startsWith('purchases/'));
    // The last player's data isn't shown while the next one's loads
    const shown = data?.profile?.userId === userId ? data : null;

    return (
        <Page title={shown ? nameOf(shown.profile) : 'Player'} icon="users" topic={<GameTopic />} actions={<PlayerSearch />}>
            <ErrorText error={error} />
            {loading && !shown ? <Loading what="their page" /> : null}

            {shown && (
                <>
                    <ProfileCard data={shown} userId={userId} />
                    <MessagingWarning />
                    <Notice status={isPurchaseStatus ? null : status} />
                    <Standing key={`standing:${userId}`} data={shown} run={run} busy={busy} />
                    <Passes data={shown} run={run} busy={busy} />
                    <Explosives data={shown} run={run} busy={busy} />
                    {shown.hasStats ? <Stats stats={shown.stats} /> : null}
                    <Cities data={shown} />

                    <div className="card">
                        <div className="card-title"><Icon name="receipt" />Purchases</div>
                        <p className="hint">
                            The newest 25 they made or were given. Deleting one removes its record, and can also take back
                            a gift's pass or an explosive purchase's sticks; nothing here refunds Robux.
                        </p>
                        <Notice status={isPurchaseStatus ? status : null} />
                        <PurchaseTable purchases={shown.purchases} busy={busy} onDelete={setDeleting} />
                    </div>
                    {deleting && (
                        <DeletePurchase key={deleting.id} purchase={deleting} data={shown} run={run} busy={busy} onClose={() => setDeleting(null)} />
                    )}
                </>
            )}
        </Page>
    );
}
