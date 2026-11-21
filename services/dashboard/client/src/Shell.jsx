import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, IconButton, ShellContext } from './components.jsx';
import { acronym, useGame } from './games.jsx';
import { Icon } from './icons.jsx';

// Laid out as Discord is: a rail of games down the left (the XeaDev logo above them is home), a sidebar of the
// pages for whichever is picked, and the page itself. Home's pages are about every game; the rest work on the game
// picked in the rail
const HOME_PAGES = [
    { to: '/', label: 'Overview', icon: 'overview' },
    { to: '/games', label: 'Games', icon: 'gamepad' },
    { to: '/settings', label: 'Settings', icon: 'sliders' },
];
const GAME_SECTIONS = [
    { title: 'Community', pages: [{ to: '/players', label: 'Players', icon: 'users' }, { to: '/cities', label: 'Live cities', icon: 'building' }] },
    { title: 'Staff', pages: [{ to: '/moderation', label: 'Moderation', icon: 'shield' }, { to: '/announce', label: 'Announce', icon: 'megaphone' }] },
    { title: 'Store', pages: [{ to: '/purchases', label: 'Purchases', icon: 'receipt' }] },
];
// Where picking a game in the rail goes from a home page
const GAME_HOME = '/players';

function isActive(pathname, to) {
    return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

const isGamePage = (pathname) => GAME_SECTIONS.some((section) => section.pages.some((page) => isActive(pathname, page.to)));

function RailItem({ active, tip, onClick, children, className = '' }) {
    return (
        <div className={`rail-item ${active ? 'active' : ''} ${className}`}>
            <span className="rail-pill" />
            <button type="button" className="rail-icon" onClick={onClick} data-tip={tip} data-tip-side="right" aria-label={tip} aria-current={active ? 'page' : undefined}>
                {children}
            </button>
        </div>
    );
}

function NavItem({ page, pathname }) {
    const active = isActive(pathname, page.to);
    return (
        <Link className={`nav-item ${active ? 'active' : ''}`} to={page.to} aria-current={active ? 'page' : undefined}>
            <Icon name={page.icon} size={20} className="nav-icon" />
            <span className="nav-label">{page.label}</span>
        </Link>
    );
}

function NavCategory({ title }) {
    return (
        <div className="nav-category">
            <Icon name="chevronDown" size={12} strokeWidth={3} />
            <span>{title}</span>
        </div>
    );
}

export default function Shell({ profile, children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { games, game, choose } = useGame();
    const [navOpen, setNavOpen] = useState(false);
    const gameMode = isGamePage(location.pathname);

    // A page picked from the drawer closes it
    useEffect(() => setNavOpen(false), [location.pathname]);
    useEffect(() => {
        if (!navOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && setNavOpen(false);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [navOpen]);

    function pickGame(slug) {
        choose(slug);
        if (!gameMode) navigate(GAME_HOME);
        else setNavOpen(false);
    }

    async function signOut() {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.reload();
    }

    const shell = useMemo(() => ({ openNav: () => setNavOpen(true) }), []);
    const { name, username, rank, userId } = profile ?? {};

    return (
        <ShellContext.Provider value={shell}>
            <div className={`app ${navOpen ? 'nav-open' : ''}`}>
                <div className="nav-backdrop" onClick={() => setNavOpen(false)} />
                <div className="nav-drawer">
                    <nav className="rail" aria-label="Games">
                        <RailItem active={!gameMode} tip="Home: every game" onClick={() => navigate('/')} className="rail-home">
                            <img src="/xeadev.png" alt="" />
                        </RailItem>
                        <div className="rail-sep" />
                        {games.map((entry) => {
                            const letters = acronym(entry.name);
                            return (
                                <RailItem key={entry.slug} active={gameMode && game?.slug === entry.slug} tip={entry.name} onClick={() => pickGame(entry.slug)}>
                                    <span className={`rail-letters len${Math.min(letters.length, 5)}`}>{letters}</span>
                                </RailItem>
                            );
                        })}
                    </nav>

                    <aside className="sidebar">
                        <div className="sidebar-head">
                            <span className="sidebar-title">{gameMode ? game?.name ?? 'Game' : 'XeaDev'}</span>
                        </div>
                        <div className="sidebar-nav scroll thin">
                            {gameMode ? GAME_SECTIONS.map((section) => (
                                <div className="nav-section" key={section.title}>
                                    <NavCategory title={section.title} />
                                    {section.pages.map((page) => <NavItem key={page.to} page={page} pathname={location.pathname} />)}
                                </div>
                            )) : (
                                <>
                                    <div className="nav-section">
                                        {HOME_PAGES.map((page) => <NavItem key={page.to} page={page} pathname={location.pathname} />)}
                                    </div>
                                    {games.length > 0 && (
                                        <div className="nav-section">
                                            <NavCategory title="Games" />
                                            {games.map((entry) => (
                                                <button type="button" key={entry.slug} className="nav-item nav-game" onClick={() => pickGame(entry.slug)}>
                                                    <span className="nav-game-icon">{acronym(entry.name)}</span>
                                                    <span className="nav-game-names">
                                                        <span className="nav-label">{entry.name}</span>
                                                        <span className="nav-sub">{entry.messagingReady ? 'Reaches its live servers' : 'Can\'t reach live servers'}</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="user-panel">
                            <Avatar profile={profile} size={32} status="online" statusTip="Signed in" />
                            <span className="user-names">
                                <span className="user-name">{name || username || userId}</span>
                                <span className="user-sub">{[username && `@${username}`, rank].filter(Boolean).join(' · ')}</span>
                            </span>
                            <IconButton icon="logOut" tip="Sign out" onClick={signOut} />
                        </div>
                    </aside>
                </div>
                <main className="main">{children}</main>
            </div>
        </ShellContext.Provider>
    );
}
