import { useEffect } from 'react';
import { useApi } from '../api.js';
import { Badge, ErrorText, GameTopic, IconButton, JoinButton, Loading, Page, Person } from '../components.jsx';
import { useGame } from '../games.jsx';
import { dateTime, duration, money, percent, timeAgo } from '../format.js';

const REFRESH_MS = 30 * 1000;
const JOIN_TIP = 'Starts Roblox in the lobby, which sends you on into this city as an invite does';

export default function Cities() {
    const { game } = useGame();
    const { data, error, loading, reload } = useApi(game ? `/api/games/${game.slug}/cities` : null);

    // Each city's server says who is in it every minute or so, so this keeps up without being asked
    useEffect(() => {
        const timer = setInterval(reload, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reload]);

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
                        in the game, admins join any of them with <span className="code">/join username</span>.
                    </p>
                    {!data.canJoin && <p className="hint">Join buttons need the game's universe ID: set it on the Games page.</p>}
                    {data.cities.length === 0 ? <p className="muted">Nobody is playing a city.</p> : data.cities.map((city) => (
                        <div className="card" key={`${city.ownerId}:${city.slot}`}>
                            <div className="city-head">
                                <Person profile={city.owner} sub={`slot ${city.slot}`} status={city.ownerPresent ? 'online' : 'offline'} />
                                <span className="grow" />
                                <Badge tone="green">{city.playerCount} / {city.maxPlayers} playing</Badge>
                                {city.ownerPresent ? <Badge tone="blurple">Owner in</Badge> : <Badge>Owner away</Badge>}
                                <JoinButton url={city.joinUrl} tip={JOIN_TIP} />
                            </div>
                            <div className="facts">
                                <span>{percent(city.cleanShare)} clean</span>
                                <span>{money(city.cash)}</span>
                                <span>played {duration(city.playTime)}</span>
                                <span data-tip={dateTime(city.lockedAt)}>heard from {timeAgo(city.lockedAt)}</span>
                            </div>
                            {city.players.length > 0
                                ? <div className="people">{city.players.map((player) => <Person key={player.userId} profile={player} small status="online" />)}</div>
                                : <p className="hint">Its server hasn't said who is in it yet.</p>}
                        </div>
                    ))}
                </>
            )}
        </Page>
    );
}
