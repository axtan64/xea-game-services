import { Link } from 'react-router-dom';
import { useGame } from './games.jsx';

// A player's headshot and names, linking to their page in the dashboard unless `plain`
export function Person({ profile, sub, plain = false, small = false }) {
    if (!profile) return <span className="muted">—</span>;

    const { userId, name, username, picture } = profile;
    const body = (
        <>
            {picture
                ? <img className={`avatar ${small ? 'small' : ''}`} src={picture} alt="" />
                : <div className={`avatar avatar-fallback ${small ? 'small' : ''}`}>{(name || username || '?')[0]}</div>}
            <span className="person-names">
                <span className="person-name">{name || username || userId}</span>
                <span className="person-sub">{sub ?? (username ? `@${username}` : userId)}</span>
            </span>
        </>
    );

    if (plain) return <span className="person">{body}</span>;
    return <Link className="person person-link" to={`/players/${userId}`}>{body}</Link>;
}

export function Badge({ tone = 'grey', children }) {
    return <span className={`badge ${tone}`}>{children}</span>;
}

export function Stat({ label, value, sub }) {
    return (
        <div className="stat">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
            {sub ? <span className="stat-sub">{sub}</span> : null}
        </div>
    );
}

// The outcome of an action: { ok, message }
export function Notice({ status }) {
    if (!status) return null;
    return <p className={`notice ${status.ok ? 'ok' : 'bad'}`}>{status.message}</p>;
}

export function PageHead({ title, children }) {
    return (
        <div className="page-head">
            <h1>{title}</h1>
            {children ? <div className="page-head-side">{children}</div> : null}
        </div>
    );
}

// Says so when the picked game can't publish to its live servers, which announcements, gifts and live bans need
export function MessagingWarning() {
    const { game } = useGame();
    if (!game || game.messagingReady) return null;

    return (
        <div className="warning">
            {game.name} can't reach its live servers yet: announcements, live kicks and bans, and gifts given here
            wait for players to rejoin, or fail. <Link to="/games">Set its universe ID and Open Cloud key</Link>.
        </div>
    );
}

export function Loading({ what = '' }) {
    return <p className="muted">Loading{what ? ` ${what}` : ''}…</p>;
}

export function ErrorText({ error }) {
    if (!error) return null;
    return <p className="notice bad">{error}</p>;
}