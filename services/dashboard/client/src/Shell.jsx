import { Link, useLocation } from 'react-router-dom';

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
                    <div className="nav">
                        <Link className={`tab ${location.pathname === '/' ? 'active' : ''}`} to="/">Home</Link>
                        <Link className={`tab ${location.pathname === '/settings' ? 'active' : ''}`} to="/settings">Settings</Link>
                    </div>
                </div>
                <div className="content scroll">{children}</div>
            </div>
        </div>
    );
}