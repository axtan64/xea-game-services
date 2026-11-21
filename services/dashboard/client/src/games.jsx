import { createContext, useContext, useState } from 'react';
import { useApi } from './api.js';

// The game the per-game pages (announcements, players, moderation, cities) work on, picked in the shell's rail and
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

// A game's initials, as Discord names a server without an icon: "Clean Up The City" is CUTC
export function acronym(name = '') {
    return name.split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 5).toUpperCase() || '?';
}
