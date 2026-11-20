import { Link, useLocation } from 'react-router-dom';
import { GamePicker } from './games.jsx';

// The sidebar's pages, in order. Announce to Purchases work on the game picked above them
const PAGES = [
    { to: '/', label: 'Overview' },
    { to: '/announce', label: 'Announce' },
    { to: '/players', label: 'Players' },
    { to: '/moderation', label: 'Moderation' },
    { to: '/cities', label: 'Live cities' },
    { to: '/purchases', label: 'Purchases' },
    { to: '/games', label: 'Games' },
    { to: '/settings', label: 'Settings' },
];

function isActive(pathname, to) {
    return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

export default function Shell({ profile, children }) {
    const location = useLocation();

    async function signOut() {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.reload();
    }

    const { name, username, picture, rank, userId } = profile ?? {};

    return (
        <div className="app">
            <div className="topbar">
                <div className="brand">
                    <img className="logo" src="/xeadev.png" alt="XeaDev" />
                    <span className="brand-name">XeaDev</span>
                </div>
                <div className="status">
                    <div className="account">
                        {picture ? (
                            <img className="account-avatar" src={picture} alt="" />
                        ) : (
                            <div className="account-avatar account-avatar-fallback">{(name || username || '?')[0]}</div>
                        )}
                        <div className="account-info">
                            <span className="account-name">{name || userId}</span>
                            <span className="account-sub">
                                {username ? `@${username}` : null}
                                {username && rank ? ' · ' : null}
                                {rank}
                            </span>
                        </div>
                    </div>
                    <button className="link-btn" onClick={signOut}>Sign out</button>
                </div>
            </div>
            <div className="layout">
                <div className="sidebar left">
                    <GamePicker />
                    <div className="nav">
                        {PAGES.map((page) => (
                            <Link key={page.to} className={`tab ${isActive(location.pathname, page.to) ? 'active' : ''}`} to={page.to}>
                                {page.label}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="content scroll">{children}</div>
            </div>
        </div>
    );
}
