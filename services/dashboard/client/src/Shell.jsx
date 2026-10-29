import { Link, useLocation } from 'react-router-dom';

export default function Shell({ userId, children }) {
    const location = useLocation();

    async function signOut() {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.reload();
    }

    return (
        <div className="app">
            <div className="topbar">
                <div className="brand">
                    <img className="logo" src="/xeadev.png" alt="XeaDev" />
                    <span className="brand-name">XeaDev</span>
                </div>
                <div className="status">
                    <span className="dot green" />
                    {userId}
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