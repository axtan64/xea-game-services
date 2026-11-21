import { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from './games.jsx';
import { Icon } from './icons.jsx';

// What the shell lends its pages: opening the navigation drawer on a narrow screen
export const ShellContext = createContext({ openNav: () => {} });

const initialOf = (profile) => (profile?.name || profile?.username || '?')[0];

// A player's headshot. `status` ('online' or 'offline') cuts a status dot into its corner, as Discord does, and
// `pulse` makes an online one pulse. `size` is 24, 32, 40 or 80
export function Avatar({ profile, size = 40, status = null, pulse = false, statusTip }) {
    return (
        <span className={`avatar-wrap s${size} ${status ? 'has-status' : ''}`}>
            {profile?.picture
                ? <img className="avatar" src={profile.picture} alt="" draggable={false} />
                : <span className="avatar avatar-fallback">{initialOf(profile)}</span>}
            {status ? (
                <span className={`status-dot ${status} ${pulse && status === 'online' ? 'pulse' : ''}`} data-tip={statusTip} aria-label={statusTip ?? status} role="img" />
            ) : null}
        </span>
    );
}

// A player's headshot and names, linking to their page in the dashboard unless `plain`
export function Person({ profile, sub, plain = false, small = false, status = null }) {
    if (!profile) return <span className="muted">—</span>;

    const { userId, name, username } = profile;
    const body = (
        <>
            <Avatar profile={profile} size={small ? 24 : 32} status={status} />
            <span className="person-names">
                <span className="person-name">{name || username || userId}</span>
                {small ? null : <span className="person-sub">{sub ?? (username ? `@${username}` : userId)}</span>}
            </span>
        </>
    );

    if (plain) return <span className={`person ${small ? 'small' : ''}`}>{body}</span>;
    return <Link className={`person person-link ${small ? 'small' : ''}`} to={`/players/${userId}`}>{body}</Link>;
}

// A pill with a coloured dot, as Discord shows a member's roles
export function Badge({ tone = 'grey', children, tip }) {
    return (
        <span className={`badge ${tone}`} data-tip={tip}>
            <span className="badge-dot" />
            {children}
        </span>
    );
}

// Starts Roblox in the game's lobby with launch data naming a city or a player, which the lobby sends the clicker
// on to (server/lib/joinLinks.js). Nothing when there's no link
export function JoinButton({ url, label = 'Join', tip, size = 'small' }) {
    if (!url) return null;
    return (
        <a className={`button green ${size}`} href={url} target="_blank" rel="noreferrer" data-tip={tip}>
            <Icon name="logIn" size={16} />
            {label}
        </a>
    );
}

export function IconButton({ icon, tip, onClick, disabled = false, className = '' }) {
    return (
        <button type="button" className={`icon-button ${className}`} data-tip={tip} aria-label={tip} onClick={onClick} disabled={disabled}>
            <Icon name={icon} size={20} />
        </button>
    );
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

const CALLOUT_ICONS = { ok: 'checkCircle', bad: 'xCircle', warn: 'alert', info: 'info' };

// A boxed message with an icon, in a tone: 'ok', 'bad', 'warn' or 'info'
export function Callout({ tone = 'info', children }) {
    return (
        <div className={`callout ${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
            <Icon name={CALLOUT_ICONS[tone]} size={20} className="callout-icon" />
            <div className="callout-text">{children}</div>
        </div>
    );
}

// The outcome of an action: { ok, message }
export function Notice({ status }) {
    if (!status) return null;
    return <Callout tone={status.ok ? 'ok' : 'bad'}>{status.message}</Callout>;
}

// A page: a header bar like a Discord channel's (icon, title, a topic after a divider, and tools on the right),
// over its scrolling body
export function Page({ title, icon, topic, actions, children, wide = false }) {
    const { openNav } = useContext(ShellContext);

    return (
        <div className="page">
            <header className="page-head">
                <button type="button" className="icon-button nav-toggle" onClick={openNav} aria-label="Open navigation">
                    <Icon name="menu" size={24} />
                </button>
                {icon ? <Icon name={icon} size={24} className="page-icon" /> : null}
                <h1>{title}</h1>
                {topic ? <><span className="page-divider" /><span className="page-topic">{topic}</span></> : null}
                <span className="grow" />
                {actions ? <div className="page-tools">{actions}</div> : null}
            </header>
            <div className="page-body scroll">
                <div className={`page-inner ${wide ? 'wide' : ''}`}>{children}</div>
            </div>
        </div>
    );
}

// The game the page works on, for a page head's topic
export function GameTopic() {
    const { game } = useGame();
    return game?.name ?? null;
}

// Says so when the picked game can't publish to its live servers, which announcements, gifts and live bans need
export function MessagingWarning() {
    const { game } = useGame();
    if (!game || game.messagingReady) return null;

    return (
        <Callout tone="warn">
            {game.name} can't reach its live servers yet: announcements, live kicks and bans, and gifts given here
            wait for players to rejoin, or fail. <Link to="/games">Set its universe ID and Open Cloud key</Link>.
        </Callout>
    );
}

// Three dots bouncing in turn, as Discord's typing indicator
export function Dots() {
    return <span className="dots" aria-hidden="true"><span /><span /><span /></span>;
}

export function Loading({ what = '' }) {
    return <p className="loading-line muted"><Dots /> Loading{what ? ` ${what}` : ''}…</p>;
}

export function ErrorText({ error }) {
    if (!error) return null;
    return <Callout tone="bad">{error}</Callout>;
}

// A heading over a group of things on a page, in Discord's small capitals
export function SectionTitle({ children }) {
    return <h2 className="section-title">{children}</h2>;
}
