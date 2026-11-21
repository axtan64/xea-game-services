import { useState } from 'react';
import { useApi } from '../api.js';
import { Badge, ErrorText, Loading, PageHead, Person, Stat } from '../components.jsx';
import { useGame } from '../games.jsx';
import { dateTime, number, robux, timeAgo } from '../format.js';

// The purchase log. With `onDelete`, each row has a Delete button that hands its purchase to it
export function PurchaseTable({ purchases, showGame = false, onDelete, busy = false }) {
    if (purchases.length === 0) return <p className="muted">No purchases yet.</p>;

    return (
        <div className="table-wrap">
            <table className="table">
                <thead>
                    <tr>
                        <th>When</th>
                        <th>Buyer</th>
                        <th>For</th>
                        <th>Product</th>
                        {showGame ? <th>Game</th> : null}
                        <th className="right">Price</th>
                        {onDelete ? <th /> : null}
                    </tr>
                </thead>
                <tbody>
                    {purchases.map((purchase) => (
                        <tr key={purchase.id}>
                            <td title={dateTime(purchase.at)}>{timeAgo(purchase.at)}</td>
                            <td><Person profile={purchase.buyer} small /></td>
                            <td>{purchase.recipient ? <Person profile={purchase.recipient} small /> : <span className="muted">themselves</span>}</td>
                            <td>
                                <span className="mono">{purchase.productKey ?? purchase.productId}</span>
                                <span className="muted"> · {purchase.productType}</span>
                            </td>
                            {showGame ? <td>{purchase.game}</td> : null}
                            <td className="right">
                                {purchase.isGrant ? <Badge tone="blurple">Given</Badge> : robux(purchase.priceRobux)}
                            </td>
                            {onDelete ? (
                                <td className="right">
                                    <button className="button small" disabled={busy} onClick={() => onDelete(purchase)}>Delete…</button>
                                </td>
                            ) : null}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Purchases() {
    const { game } = useGame();
    const [allGames, setAllGames] = useState(false);
    const path = allGames ? '/api/purchases?take=200' : game ? `/api/purchases?game=${game.slug}&take=200` : null;
    const { data, error, loading, reload } = useApi(path);

    return (
        <div className="page">
            <PageHead title="Purchases">
                <label className="check">
                    <input type="checkbox" checked={allGames} onChange={(e) => setAllGames(e.target.checked)} />
                    Every game
                </label>
                <button className="button" onClick={reload}>Refresh</button>
            </PageHead>
            <p className="muted">{allGames ? 'Every game' : game?.name}: the newest 200, and what buyers paid before Roblox's cut.</p>
            <ErrorText error={error} />
            {loading && !data ? <Loading /> : null}

            {data && (
                <>
                    <div className="stats">
                        <Stat label="Last 24 hours" value={robux(data.totals.day.robux)} sub={`${number(data.totals.day.count)} sales`} />
                        <Stat label="Last 7 days" value={robux(data.totals.week.robux)} sub={`${number(data.totals.week.count)} sales`} />
                        <Stat label="Last 30 days" value={robux(data.totals.month.robux)} sub={`${number(data.totals.month.count)} sales`} />
                    </div>
                    <PurchaseTable purchases={data.purchases} showGame={allGames} />
                </>
            )}
        </div>
    );
}
