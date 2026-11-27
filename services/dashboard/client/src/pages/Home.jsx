import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../api.js';
import { Callout, ErrorText, Loading, Page, SectionTitle, Stat } from '../components.jsx';
import { dateTime, number, robux, timeAgo } from '../format.js';
import { acronym } from '../games.jsx';
import { PurchaseTable } from './Purchases.jsx';

// The server reads each game's players once a minute (server/lib/ccu.js), so the page asks again as often
const REFRESH_MS = 60 * 1000;

// The most players in each game at once, and how many are in it now, for every game with a universe ID
function Concurrency({ games }) {
    const tracked = games.filter((game) => game.universeId);
    if (tracked.length === 0) return null;

    // A row for each game; with more than one, each stat says whose it is
    const named = (label, game) => (tracked.length > 1 ? `${label}, ${acronym(game.name)}` : label);

    return (
        <>
            <SectionTitle>Highest CCU</SectionTitle>
            <div className="stats-rows">
                {tracked.map((game) => (
                    <div className="stats" key={game.slug}>
                        <Stat
                            label={named('Highest ever', game)}
                            value={number(game.peakCcu)}
                            sub={game.peakCcuAt ? dateTime(game.peakCcuAt) : 'Nobody counted yet'}
                        />
                        <Stat
                            label={named('CCU now', game)}
                            value={game.ccuNow ? number(game.ccuNow.playing) : '—'}
                            sub={game.ccuNow ? `Read ${timeAgo(game.ccuNow.at)}` : 'Not read yet'}
                        />
                    </div>
                ))}
            </div>
            <p className="hint">
                Players in every server at once, lobbies and cities, as Roblox counts them, read every minute. The
                highest is kept from when the dashboard began reading, so an earlier peak isn't known.
            </p>
        </>
    );
}

export default function Home() {
    const { data, error, loading, reload } = useApi('/api/overview');

    useEffect(() => {
        const timer = setInterval(reload, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reload]);

    return (
        <Page title="Overview" icon="overview" topic="Every game">
            <ErrorText error={error} />
            {loading && !data ? <Loading /> : null}

            {data && (
                <>
                    {data.games.filter((game) => !game.messagingReady).map((game) => (
                        <Callout tone="warn" key={game.slug}>
                            {game.name} has no universe ID or Open Cloud key, so it can't send global announcements,
                            gifts or live bans. <Link to="/games">Set them on Games</Link>.
                        </Callout>
                    ))}

                    <Concurrency games={data.games} />

                    <SectionTitle>Clean Up The City</SectionTitle>
                    <div className="stats">
                        <Stat label="Players ever" value={number(data.cutc.players)} />
                        <Stat label="Cities being played" value={number(data.cutc.liveCities)} sub={<Link to="/cities">See them</Link>} />
                        <Stat label="Players in cities" value={number(data.cutc.playersInCities)} />
                    </div>

                    <SectionTitle>Sales, every game</SectionTitle>
                    <div className="stats">
                        <Stat label="Last 24 hours" value={robux(data.totals.day.robux)} sub={`${number(data.totals.day.count)} sales`} />
                        <Stat label="Last 7 days" value={robux(data.totals.week.robux)} sub={`${number(data.totals.week.count)} sales`} />
                        <Stat label="Last 30 days" value={robux(data.totals.month.robux)} sub={`${number(data.totals.month.count)} sales`} />
                    </div>
                    <p className="hint">What buyers paid, before Roblox's cut. Grants aren't counted.</p>

                    <SectionTitle>Latest purchases</SectionTitle>
                    <div className="card">
                        <PurchaseTable purchases={data.recent} showGame />
                    </div>
                    <p className="hint"><Link className="text-link" to="/purchases">The whole log</Link></p>
                </>
            )}
        </Page>
    );
}