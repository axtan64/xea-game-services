import { createContext, useContext, useState } from 'react';
import { useApi } from './api.js';

// The game the per-game pages (announcements, players, moderation, cities) work on, picked in the sidebar and
// remembered in this browser
const GameContext = createContext(null);
const STORAGE_KEY = 'dashboard.game';
const DEFAULT_SLUG = 'cutc';

function readStored() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function GameProvider({ children }) {
    const { data, error, reload } = useApi('/api/games');
    const [slug, setSlug] = useState(readStored);
    const games = data ?? [];
    const game = games.find((entry) => entry.slug === slug)
        ?? games.find((entry) => entry.slug === DEFAULT_SLUG)
        ?? games[0]
        ?? null;

    function choose(next) {
        setSlug(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Private windows refuse storage; the pick lasts until the page closes
        }
    }

    return (
        <GameContext.Provider value={{ games, game, choose, error, reload, loaded: data !== null }}>
            {children}
        </GameContext.Provider>
    );
}

export const useGame = () => useContext(GameContext);

export function GamePicker() {
    const { games, game, choose } = useGame();
    if (games.length === 0) return null;

    return (
        <label className="game-picker">
            <span className="field-label">Game</span>
            <select className="input" value={game?.slug ?? ''} onChange={(e) => choose(e.target.value)}>
                {games.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}
            </select>
        </label>
    );
}