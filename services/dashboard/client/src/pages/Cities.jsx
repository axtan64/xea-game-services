import { useEffect, useState } from 'react';
import { api, useApi } from '../api.js';
import { Badge, ErrorText, GameTopic, IconButton, JoinButton, Loading, Notice, Page, Person } from '../components.jsx';
import { useGame } from '../games.jsx';
import { Icon } from '../icons.jsx';
import { useConfirm } from '../ui.jsx';
import { dateTime, duration, money, percent, timeAgo } from '../format.js';

const REFRESH_MS = 30 * 1000;
const JOIN_TIP = 'Starts Roblox in the lobby, which sends you on into this city as an invite does';
const RESTART_TIP = 'Saves this city and moves its players on to a fresh server of the same city';

const cityKey = (city) => `${city.ownerId}:${city.slot}`;
const ownerName = (city) => city.owner?.name || city.owner?.username || city.ownerId;
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// Whether a player is who the search means: part of their username or display name, or their user ID exactly.
// `needle` is already lower case, with any @ taken off the front
function isFound(profile, needle) {
    if (!profile || !needle) return false;
    return (profile.username ?? '').toLowerCase().includes(needle)
        || (profile.name ?? '').toLowerCase().includes(needle)
        || String(profile.userId) === needle;
}

// Narrows the live cities to those whose owner or players the words name, as the Players page's search finds a
// player. Every live city is on the page already, so it filters as it's typed, with nothing to ask
function CitySearch({ query, onChange }) {
    return (
        <div className={`search large ${query ? 'has-text' : ''}`}>
            <div className="search-box">
                <span className="search-icon"><Icon name="search" size={20} /></span>
                <input
                    className="search-input"
                    value={query}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') onChange(''); }}
                    placeholder="Search by username, display name or user ID"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Find a city by a player in it"
                />
                {query ? (
                    <button type="button" className="search-icon" aria-label="Clear" onClick={() => onChange('')}>
                        <Icon name="x" size={20} />
                    </button>
                ) : null}
            </div>
        </div>
    );
}

export default function Cities() {
    const { game } = useGame();
    const { data, error, loading, reload } = useApi(game ? `/api/games/${game.slug}/cities` : null);
    const [query, setQuery] = useState('');
    const [restarting, setRestarting] = useState(null);
    const [status, setStatus] = useState(null);
    const confirm = useConfirm();

    // Each city's server says who is in it every minute or so, so this keeps up without being asked
    useEffect(() => {
        const timer = setInterval(reload, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reload]);

    // Another game picked in the sidebar starts afresh
    useEffect(() => {
        setQuery('');
        setStatus(null);
    }, [game?.slug]);

    // Soft restarts one city's server, as the Announce page's picked restart does (Systems/Shutdown/SoftRestarting
    // in the game): it saves, and its players arrive in the same city on a fresh server running the latest version
    async function restart(city) {
        const asked = await confirm({
            title: `Restart ${ownerName(city)}'s city`,
            body: `Slot ${city.slot} saves, shows its ${plural(city.playerCount, 'player', 'players')} the shutdown screen `
                + 'and teleports them on to a fresh server running the latest published version, back into the same city. '
                + 'Every other server carries on.',
            confirmLabel: 'Restart this city',
            danger: true,
        });
        if (!asked) return;

        setRestarting(cityKey(city));
        try {
            const result = await api(`/api/games/${game.slug}/restart`, {
                method: 'POST',
                body: { cities: [{ ownerId: city.ownerId, slot: city.slot }] },
            });
            setStatus(result.cities > 0
                ? { ok: true, message: `Sent to ${ownerName(city)}'s city. Its players move on within a few seconds.` }
                : { ok: false, message: `${ownerName(city)}'s city had already closed.` });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setRestarting(null);
            reload();
        }
    }

    const needle = query.trim().replace(/^@/, '').toLowerCase();
    const cities = data?.supported ? data.cities : [];
    const shown = needle
        ? cities.filter((city) => isFound(city.owner, needle) || city.players.some((player) => isFound(player, needle)))
        : cities;

    return (
        <Page title="Live cities" icon="building" topic={<GameTopic />} actions={<IconButton icon="refresh" tip="Refresh" onClick={reload} />}>
            <ErrorText error={error} />
            {loading && !data ? <Loading /> : null}

            {data && !data.supported && <p className="lead">{game.name} has no cities.</p>}
            {data?.supported && (
                <>
                    <p className="lead">
                        Every city being played now, as its server last said with a save or heartbeat. Refreshes every
                        30 seconds. Join starts Roblox in the lobby, which sends you on into the city as an invite does;
                        in the game, admins join any of them with <span className="code">/join username</span>. Restart
                        saves a city and moves its players on to a fresh server of it.
                    </p>
                    {!data.canJoin && <p className="hint">Join buttons need the game's universe ID: set it on the Games page.</p>}
                    {cities.length > 0 && <CitySearch query={query} onChange={setQuery} />}
                    <Notice status={status} />
                    {cities.length === 0 && <p className="muted">Nobody is playing a city.</p>}
                    {cities.length > 0 && needle && (
                        <p className="hint">
                            {shown.length === 0
                                ? `No live city has anyone matching “${query.trim()}”.`
                                : `${plural(shown.length, 'city', 'cities')} of ${cities.length} with someone matching “${query.trim()}”.`}
                        </p>
                    )}
                    {shown.map((city) => (
                        <div className="card" key={cityKey(city)}>
                            <div className="city-head">
                                <span className={`person-slot ${isFound(city.owner, needle) ? 'found' : ''}`}>
                                    <Person profile={city.owner} sub={`slot ${city.slot}`} status={city.ownerPresent ? 'online' : 'offline'} />
                                </span>
                                <span className="grow" />
                                <Badge tone="green">{city.playerCount} / {city.maxPlayers} playing</Badge>
                                {city.ownerPresent ? <Badge tone="blurple">Owner in</Badge> : <Badge>Owner away</Badge>}
                                <JoinButton url={city.joinUrl} tip={JOIN_TIP} />
                                <button
                                    type="button"
                                    className="button danger small"
                                    data-tip={RESTART_TIP}
                                    disabled={restarting !== null}
                                    onClick={() => restart(city)}
                                >
                                    <Icon name="refresh" size={16} />
                                    {restarting === cityKey(city) ? 'Restarting…' : 'Restart'}
                                </button>
                            </div>
                            <div className="facts">
                                <span>{percent(city.cleanShare)} clean</span>
                                <span>{money(city.cash)}</span>
                                <span>played {duration(city.playTime)}</span>
                                <span data-tip={dateTime(city.lockedAt)}>heard from {timeAgo(city.lockedAt)}</span>
                            </div>
                            {city.players.length > 0
                                ? (
                                    <div className="people">
                                        {city.players.map((player) => (
                                            <span key={player.userId} className={`person-slot ${isFound(player, needle) ? 'found' : ''}`}>
                                                <Person profile={player} small status="online" />
                                            </span>
                                        ))}
                                    </div>
                                )
                                : <p className="hint">Its server hasn't said who is in it yet.</p>}
                        </div>
                    ))}
                </>
            )}
        </Page>
    );
}
