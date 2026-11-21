import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Avatar, Dots, GameTopic, Page } from '../components.jsx';
import { useGame } from '../games.jsx';
import { Icon } from '../icons.jsx';
import { timeAgo } from '../format.js';

// How long typing must pause before the preview asks again
const DEBOUNCE_MS = 250;
const USER_ID = /^\d{1,19}$/;
const USERNAME = /^@?[A-Za-z0-9_]{3,20}$/;

const canSearch = (text) => USER_ID.test(text) || USERNAME.test(text);

// What a result says on its right: in the game now, or whether they have played it
function ResultSide({ result }) {
    if (result.inGame) return <span className="tag green">In game</span>;
    if (!result.hasPlayed) return <span>Never played</span>;
    return <span>{result.lastSeenAt ? `Seen ${timeAgo(result.lastSeenAt)}` : 'Has played'}</span>;
}

// Finds a player by username, display name or user ID, previewing who the words may mean as they're typed
// (players/search), and opens their page. `large` is the Players page's own box; otherwise it's the small one in a
// page head, which widens while in use as Discord's search does
export function PlayerSearch({ large = false, autoFocus = false }) {
    const { game } = useGame();
    const navigate = useNavigate();
    const listId = useId();
    const inputRef = useRef(null);
    const latest = useRef(0);
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);
    const [found, setFound] = useState({ text: '', results: [], loading: false, error: null });
    const [active, setActive] = useState(0);
    const text = query.trim();
    const searchable = canSearch(text);

    useEffect(() => {
        const ticket = ++latest.current;
        if (!game || !searchable) {
            setFound({ text, results: [], loading: false, error: null });
            return undefined;
        }

        setFound((previous) => ({ ...previous, loading: true, error: null }));
        const timer = setTimeout(async () => {
            try {
                const { results } = await api(`/api/games/${game.slug}/players/search?q=${encodeURIComponent(text)}`);
                if (ticket !== latest.current) return;
                setFound({ text, results, loading: false, error: null });
                setActive(0);
            } catch (err) {
                if (ticket === latest.current) setFound({ text, results: [], loading: false, error: err.message });
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [game?.slug, text, searchable]); // eslint-disable-line react-hooks/exhaustive-deps

    function go(userId) {
        setQuery('');
        inputRef.current?.blur();
        navigate(`/players/${userId}`);
    }

    // Enter before the preview has caught up, or when it found nobody, asks for that exact name or ID instead
    async function findExact() {
        setFound((previous) => ({ ...previous, loading: true }));
        try {
            const { userId } = await api(`/api/games/${game.slug}/players/find?q=${encodeURIComponent(text)}`);
            go(userId);
        } catch (err) {
            setFound({ text, results: [], loading: false, error: err.message });
        }
    }

    const isFresh = found.text === text;
    const results = isFresh || found.loading ? found.results : [];

    function onKeyDown(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (results.length === 0) return;
            e.preventDefault();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((index) => (index + step + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (!text || !game) return;
            if (isFresh && !found.loading && results[active]) go(results[active].profile.userId);
            else if (searchable) findExact();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            if (query) setQuery('');
            else inputRef.current?.blur();
        }
    }

    const isOpen = focused && text.length > 0;
    let body;
    if (!searchable) {
        body = <div className="search-empty">Type a username (3 to 20 letters, digits or _), or a user ID.</div>;
    } else if (found.error && isFresh) {
        body = <div className="search-empty red-text">{found.error}</div>;
    } else if (results.length > 0) {
        body = (
            <div className="search-results" role="listbox" id={listId}>
                {results.map((result, index) => (
                    <div
                        key={result.profile.userId}
                        role="option"
                        aria-selected={index === active}
                        className={`search-row ${index === active ? 'active' : ''}`}
                        onMouseEnter={() => setActive(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(result.profile.userId)}
                    >
                        <Avatar
                            profile={result.profile}
                            size={32}
                            status={result.inGame === null ? null : result.inGame ? 'online' : 'offline'}
                        />
                        <span className="search-names">
                            <span className="search-name">{result.profile.name || result.profile.username}</span>
                            <span className="search-username">@{result.profile.username}</span>
                        </span>
                        <span className="search-side">
                            {result.isExact ? <span className="tag">Exact</span> : null}
                            <ResultSide result={result} />
                        </span>
                    </div>
                ))}
            </div>
        );
    } else if (found.loading || !isFresh) {
        body = <div className="search-empty"><Dots /> Searching Roblox…</div>;
    } else {
        body = <div className="search-empty">No one on Roblox matches “{text}”.</div>;
    }

    return (
        <div className={`search ${large ? 'large' : ''} ${focused ? 'focused' : ''} ${text ? 'has-text' : ''}`}>
            <div className="search-box">
                {large ? <span className="search-icon"><Icon name="search" size={20} /></span> : null}
                <input
                    ref={inputRef}
                    className="search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={onKeyDown}
                    placeholder={large ? 'Search by username, display name or user ID' : 'Find a player'}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    spellCheck={false}
                    role="combobox"
                    aria-label="Find a player"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-autocomplete="list"
                />
                {text ? (
                    <button type="button" className="search-icon" aria-label="Clear" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery('')}>
                        <Icon name="x" size={large ? 20 : 16} />
                    </button>
                ) : (large ? null : <span className="search-icon"><Icon name="search" size={16} /></span>)}
            </div>
            {isOpen && (
                <div className="search-popout">
                    <div className="search-heading">
                        <span>{results.length > 0 ? `Players — ${results.length}` : 'Players'}</span>
                        {found.loading && results.length > 0 ? <Dots /> : null}
                    </div>
                    {body}
                    <div className="search-foot">
                        <span><span className="kbd">↑</span><span className="kbd">↓</span> to pick</span>
                        <span><span className="kbd">↵</span> to open</span>
                        <span><span className="kbd">esc</span> to clear</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Players() {
    return (
        <Page title="Players" icon="users" topic={<GameTopic />}>
            <p className="lead">
                Look anyone up, whether or not they're online: their standing, stats, passes, cities and purchases, and
                ban, kick, make admin or give passes from their page. As you type, Roblox's own search previews who you
                may mean, with a green dot on anyone in the game now. Digits are read as a user ID; put @ before a
                username that is only digits.
            </p>
            <PlayerSearch large autoFocus />
        </Page>
    );
}
