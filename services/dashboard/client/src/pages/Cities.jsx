import { useEffect } from 'react';
import { useApi } from '../api.js';
import { Badge, ErrorText, Loading, PageHead, Person } from '../components.jsx';
import { useGame } from '../games.jsx';
import { dateTime, duration, money, percent, timeAgo } from '../format.js';

const REFRESH_MS = 30 * 1000;

export default function Cities() {
    const { game } = useGame();
    const { data, error, loading, reload } = useApi(game ? `/api/games/${game.slug}/cities` : null);

    // Each city's server says who is in it every minute or so, so this keeps up without being asked
    useEffect(() => {
        const timer = setInterval(reload, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reload]);

    return (
        <div className="page">
            <PageHead title="Live cities">
                <button className="button" onClick={reload}>Refresh</button>
            </PageHead>
            <ErrorText error={error} />
            {loading && !data ? <Loading /> : null}

            {data && !data.supported && <p className="muted">{game.name} has no cities.</p>}
            {data?.supported && (
                <>
                    <p className="muted">
                        Every city being played now, as its server last said with a save or heartbeat. Refreshes every
                        30 seconds. Admins join any of them with <span className="mono">/join username</span>.
                    </p>
                    {data.cities.length === 0 ? <p className="muted">Nobody is playing a city.</p> : (
                        <div className="city-list">
                            {data.cities.map((city) => (
                                <div className="card" key={`${city.ownerId}:${city.slot}`}>
                                    <div className="row-line">
                                        <Person profile={city.owner} sub={`slot ${city.slot}`} />
                                        <span className="grow" />
                                        <Badge tone="green">{city.playerCount} / {city.maxPlayers}</Badge>
                                        {city.ownerPresent ? <Badge tone="blurple">Owner in</Badge> : <Badge>Owner away</Badge>}
                                    </div>
                                    <div className="city-facts">
                                        <span>{percent(city.cleanShare)} clean</span>
                                        <span>{money(city.cash)}</span>
                                        <span>played {duration(city.playTime)}</span>
                                        <span title={dateTime(city.lockedAt)}>heard from {timeAgo(city.lockedAt)}</span>
                                    </div>
                                    {city.players.length > 0
                                        ? <div className="people">{city.players.map((player) => <Person key={player.userId} profile={player} small />)}</div>
                                        : <p className="hint muted">Its server hasn't said who is in it yet.</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}