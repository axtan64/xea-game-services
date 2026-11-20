import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Notice, PageHead } from '../components.jsx';
import { useGame } from '../games.jsx';

// Finds a player by username or user ID and opens their page
export function PlayerSearch({ autoFocus = false }) {
    const { game } = useGame();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState(null);
    const [finding, setFinding] = useState(false);

    async function find(e) {
        e.preventDefault();
        if (!game || !query.trim()) return;

        setFinding(true);
        setStatus(null);
        try {
            const { userId } = await api(`/api/games/${game.slug}/players/find?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
            navigate(`/players/${userId}`);
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setFinding(false);
        }
    }

    return (
        <form className="inline-form" onSubmit={find}>
            <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Username or user ID"
                autoFocus={autoFocus}
            />
            <button className="primary" type="submit" disabled={finding || !query.trim()}>{finding ? 'Finding…' : 'Find'}</button>
            <Notice status={status} />
        </form>
    );
}

export default function Players() {
    return (
        <div className="page">
            <PageHead title="Players" />
            <p className="muted">
                Look anyone up, whether or not they're online: their standing, stats, passes, cities and purchases, and
                ban, kick, make admin or give passes from their page. Digits are read as a user ID; put @ before a
                username that is only digits.
            </p>
            <PlayerSearch autoFocus />
        </div>
    );
}
