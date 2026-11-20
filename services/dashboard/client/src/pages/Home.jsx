import { Link } from 'react-router-dom';
import { useApi } from '../api.js';
import { ErrorText, Loading, PageHead, Stat } from '../components.jsx';
import { number, robux } from '../format.js';
import { PurchaseTable } from './Purchases.jsx';

export default function Home() {
    const { data, error, loading } = useApi('/api/overview');

    return (
        <div className="page">
            <PageHead title="Overview" />
            <ErrorText error={error} />
            {loading && !data ? <Loading /> : null}

            {data && (
                <>
                    {data.games.filter((game) => !game.messagingReady).map((game) => (
                        <div className="warning" key={game.slug}>
                            {game.name} has no universe ID or Open Cloud key, so it can't send global announcements,
                            gifts or live bans. <Link to="/games">Set them on Games</Link>.
                        </div>
                    ))}

                    <div className="section-title">Clean Up The City</div>
                    <div className="stats">
                        <Stat label="Players ever" value={number(data.cutc.players)} />
                        <Stat label="Cities being played" value={number(data.cutc.liveCities)} sub={<Link to="/cities">See them</Link>} />
                        <Stat label="Players in cities" value={number(data.cutc.playersInCities)} />
                    </div>

                    <div className="section-title">Sales, every game</div>
                    <div className="stats">
                        <Stat label="Last 24 hours" value={robux(data.totals.day.robux)} sub={`${number(data.totals.day.count)} sales`} />
                        <Stat label="Last 7 days" value={robux(data.totals.week.robux)} sub={`${number(data.totals.week.count)} sales`} />
                        <Stat label="Last 30 days" value={robux(data.totals.month.robux)} sub={`${number(data.totals.month.count)} sales`} />
                    </div>
                    <p className="hint muted">What buyers paid, before Roblox's cut. Grants aren't counted.</p>

                    <div className="section-title">Latest purchases</div>
                    <PurchaseTable purchases={data.recent} showGame />
                    <p className="hint"><Link className="text-link" to="/purchases">The whole log</Link></p>
                </>
            )}
        </div>
    );
}
