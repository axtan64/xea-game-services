import { useEffect, useState } from 'react';
import { api, useApi } from '../api.js';
import { Badge, ErrorText, GameTopic, IconButton, MessagingWarning, Notice, Page, Person, SectionTitle } from '../components.jsx';
import { useGame } from '../games.jsx';
import { Icon } from '../icons.jsx';
import { useConfirm } from '../ui.jsx';
import { byteLength, dateTime, timeAgo } from '../format.js';

// The game clips anything longer (Services/Admin/Notices' MAX_TEXT, in bytes)
const MAX_BYTES = 300;

// The live cities are read again this often, as the Live cities page does
const REFRESH_MS = 30 * 1000;

const cityKey = (city) => `${city.ownerId}:${city.slot}`;
const ownerName = (city) => city.owner?.name || city.owner?.username || city.ownerId;
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// What a restart reached, in words
function describeSent(result) {
    if (result.everyServer) return 'Sent. Every live server moves its players on within a few seconds.';

    const reached = [result.cities > 0 && plural(result.cities, 'city', 'cities'), result.lobbies && 'every lobby'].filter(Boolean);
    const gone = result.gone?.length
        ? ` ${plural(result.gone.length, 'picked city', 'picked cities')} had already closed and ${result.gone.length === 1 ? 'was' : 'were'} left out.`
        : '';
    return `Sent to ${reached.join(' and ')}. Each moves its players on within a few seconds.${gone}`;
}

// The servers a restart is about to reach, for the question before it
function PickedServers({ cities, lobbies }) {
    return (
        <>
            <p>
                These save, show their players the shutdown screen and teleport them on to a fresh server running the latest
                published version, a city's players to the same city:
            </p>
            <ul className="picked-servers">
                {cities.map((city) => (
                    <li key={cityKey(city)}>{ownerName(city)}'s city, slot {city.slot}: {plural(city.playerCount, 'player', 'players')}</li>
                ))}
                {lobbies && <li>Every lobby: their players hop to a fresh lobby</li>}
            </ul>
            <p className="hint">Every other server carries on.</p>
        </>
    );
}

// Soft restarts every live server, or (Clean Up The City) the cities and lobbies picked: each saves and moves its
// players on to a fresh one (Systems/Shutdown/SoftRestarting in the game). Cities are picked one by one from the
// live cities list. Lobbies go all together: nothing records them one by one, and a lobby's players hop back
// through matchmaking, where only a restart of every lobby makes sure they land in a fresh one
function RestartServers({ game }) {
    const { data, error, reload } = useApi(game ? `/api/games/${game.slug}/cities` : null);
    const [picked, setPicked] = useState(() => new Set());
    const [lobbies, setLobbies] = useState(false);
    const [status, setStatus] = useState(null);
    const [restarting, setRestarting] = useState(false);
    const confirm = useConfirm();

    useEffect(() => {
        const timer = setInterval(reload, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reload]);

    // Another game picked in the sidebar starts with nothing picked
    useEffect(() => {
        setPicked(new Set());
        setLobbies(false);
        setStatus(null);
    }, [game?.slug]);

    const canPick = Boolean(data?.supported);
    const cities = canPick ? data.cities : [];
    // A city that has left the list since it was picked is left out
    const pickedCities = cities.filter((city) => picked.has(cityKey(city)));
    const pickedCount = pickedCities.length + (lobbies ? 1 : 0);
    const isEveryCityPicked = cities.length > 0 && pickedCities.length === cities.length;

    function toggle(city) {
        setPicked((current) => {
            const next = new Set(current);
            if (!next.delete(cityKey(city))) next.add(cityKey(city));
            return next;
        });
    }

    // `target` is { cities, lobbies } for the servers picked, or nothing for every server
    async function restart(target) {
        if (!game) return;
        const asked = await confirm(target ? {
            title: 'Soft restart the servers picked',
            body: <PickedServers cities={pickedCities} lobbies={lobbies} />,
            confirmLabel: 'Restart these',
            danger: true,
        } : {
            title: 'Soft restart every server',
            body: `Every live server of ${game.name} saves, and everyone is teleported to a fresh server running the latest `
                + 'published version: a city\'s players arrive in the same city.',
            confirmLabel: 'Restart every server',
            danger: true,
        });
        if (!asked) return;

        setRestarting(true);
        try {
            const result = await api(`/api/games/${game.slug}/restart`, { method: 'POST', body: target });
            setStatus({ ok: true, message: describeSent(result) });
            if (target) {
                setPicked(new Set());
                setLobbies(false);
            }
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setRestarting(false);
        }
    }

    const restartPicked = () => restart({
        cities: pickedCities.map((city) => ({ ownerId: city.ownerId, slot: city.slot })),
        lobbies,
    });

    return (
        <>
            <SectionTitle>Restart servers</SectionTitle>
            <div className="card">
                <p className="hint">
                    A soft restart: a server saves, shows its players the shutdown screen and teleports them on to a fresh
                    server running the latest published version. A city's players arrive in the same city, the lobby's in a
                    new lobby, each where they stood. Announce it a few minutes ahead if you can.
                </p>

                {canPick && (
                    <>
                        <div className="pick-head">
                            <span className="field-label">Pick servers</span>
                            <span className="grow" />
                            {cities.length > 0 && (
                                <button
                                    type="button"
                                    className="button link small"
                                    onClick={() => setPicked(isEveryCityPicked ? new Set() : new Set(cities.map(cityKey)))}
                                >
                                    {isEveryCityPicked ? 'Unpick every city' : 'Pick every city'}
                                </button>
                            )}
                            <IconButton icon="refresh" tip="Refresh the cities" onClick={reload} />
                        </div>
                        <ErrorText error={error} />
                        <ul className="list pick-list">
                            <li>
                                <label className={`list-row pick-row ${lobbies ? 'checked' : ''}`}>
                                    <span className="check"><input type="checkbox" checked={lobbies} onChange={(e) => setLobbies(e.target.checked)} /></span>
                                    <span className="avatar-wrap s32"><span className="avatar avatar-fallback"><Icon name="users" size={18} /></span></span>
                                    <span className="person-names pick-lobby">
                                        <span className="person-name">Every lobby</span>
                                        <span className="person-sub">Their players hop to a fresh lobby. Lobbies restart all together</span>
                                    </span>
                                </label>
                            </li>
                            {cities.map((city) => {
                                const isPicked = picked.has(cityKey(city));
                                return (
                                    <li key={cityKey(city)}>
                                        <label className={`list-row pick-row ${isPicked ? 'checked' : ''}`}>
                                            <span className="check"><input type="checkbox" checked={isPicked} onChange={() => toggle(city)} /></span>
                                            <Person profile={city.owner} sub={`slot ${city.slot}`} plain status={city.ownerPresent ? 'online' : 'offline'} />
                                            <span className="grow" />
                                            <Badge tone="green">{city.playerCount} / {city.maxPlayers} playing</Badge>
                                            <span className="pick-heard" data-tip={dateTime(city.lockedAt)}>heard from {timeAgo(city.lockedAt)}</span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                        {cities.length === 0 && <p className="hint">Nobody is playing a city.</p>}
                    </>
                )}

                <div className="row-line restart-actions">
                    {canPick && (
                        <button className="button danger" type="button" disabled={restarting || pickedCount === 0} onClick={restartPicked}>
                            <Icon name="refresh" size={16} />
                            {restarting ? 'Restarting…' : `Restart picked${pickedCount > 0 ? ` (${pickedCount})` : ''}`}
                        </button>
                    )}
                    <button className="button danger" type="button" disabled={restarting || !game} onClick={() => restart()}>
                        <Icon name="refresh" size={16} />
                        {restarting ? 'Restarting…' : 'Soft restart every server'}
                    </button>
                </div>
                <Notice status={status} />
            </div>
        </>
    );
}

// A sketch of the in-game banner (Systems/UI/Announcement/AnnouncementBanner), so the words can be read as players will see them
function BannerPreview({ message, fromTeam, profile }) {
    const name = fromTeam ? 'The developers' : profile?.name || profile?.username || 'You';

    return (
        <div className="banner-preview">
            <div className="banner-ribbon">📣 DEVELOPER ANNOUNCEMENT <span className="banner-scope">GLOBAL</span></div>
            <div className="banner-body">
                {fromTeam && <div className="banner-avatar">🏙️</div>}
                {!fromTeam && (profile?.picture
                    ? <img className="banner-avatar" src={profile.picture} alt="" />
                    : <div className="banner-avatar">{name[0]}</div>)}
                <div className="banner-text">
                    <div className="banner-sender">{name} <span className="banner-tag">DEVELOPER</span></div>
                    <div className="banner-message">{message || <span className="muted">Your announcement</span>}</div>
                </div>
            </div>
        </div>
    );
}

export default function Announce({ profile }) {
    const { game } = useGame();
    const [message, setMessage] = useState('');
    const [fromTeam, setFromTeam] = useState(false);
    const [status, setStatus] = useState(null);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState([]);
    const bytes = byteLength(message.trim());
    const confirm = useConfirm();

    async function send(e) {
        e.preventDefault();
        if (!game || !message.trim() || bytes > MAX_BYTES) return;
        const asked = await confirm({
            title: 'Send this announcement',
            body: `Show it to everyone in every live server of ${game.name}? It can't be taken back once sent.`,
            confirmLabel: 'Send',
        });
        if (!asked) return;

        setSending(true);
        try {
            await api(`/api/games/${game.slug}/announce`, { method: 'POST', body: { message, fromTeam } });
            setSent((previous) => [{ message: message.trim(), at: new Date(), game: game.name }, ...previous]);
            setMessage('');
            setStatus({ ok: true, message: 'Sent. Every live server shows it within a few seconds.' });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSending(false);
        }
    }

    return (
        <Page title="Announce" icon="megaphone" topic={<GameTopic />}>
            <p className="lead">
                A banner across the top of every player's screen in every live server of {game?.name ?? 'the game'},
                with a chime, as <span className="code">/announce global</span> shows it. It isn't kept: players who
                join later don't see it.
            </p>
            <MessagingWarning />

            <form onSubmit={send}>
                <label className="field">
                    <span className="field-label">Message</span>
                    <textarea
                        className="input textarea"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="The city servers restart in 5 minutes for an update!"
                    />
                    <span className={`counter ${bytes > MAX_BYTES ? 'red-text' : 'muted'}`}>{bytes} / {MAX_BYTES}</span>
                </label>

                <div className="field">
                    <span className="field-label">From</span>
                    <div className="radio-group" role="radiogroup">
                        <label className={`radio ${!fromTeam ? 'checked' : ''}`}>
                            <input type="radio" name="from" checked={!fromTeam} onChange={() => setFromTeam(false)} />
                            <span>Me<span className="radio-sub">My headshot and name</span></span>
                        </label>
                        <label className={`radio ${fromTeam ? 'checked' : ''}`}>
                            <input type="radio" name="from" checked={fromTeam} onChange={() => setFromTeam(true)} />
                            <span>The developers<span className="radio-sub">The game's icon</span></span>
                        </label>
                    </div>
                </div>

                <div className="field">
                    <span className="field-label">Preview</span>
                    <BannerPreview message={message.trim()} fromTeam={fromTeam} profile={profile} />
                </div>

                <button className="button brand" type="submit" disabled={sending || !message.trim() || bytes > MAX_BYTES}>
                    <Icon name="megaphone" size={16} />
                    {sending ? 'Sending…' : 'Send to every server'}
                </button>
            </form>
            <Notice status={status} />

            {sent.length > 0 && (
                <>
                    <SectionTitle>Sent from this page</SectionTitle>
                    <div className="card">
                        <ul className="list">
                            {sent.map((entry) => (
                                <li className="list-row sent" key={entry.at.getTime()}>
                                    <span className="grow">{entry.message}</span>
                                    <span className="muted nowrap">{timeAgo(entry.at)} · {entry.game}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}

            <RestartServers game={game} />
        </Page>
    );
}