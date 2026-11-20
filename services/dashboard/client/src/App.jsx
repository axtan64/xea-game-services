import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Announce from './pages/Announce.jsx';
import Players from './pages/Players.jsx';
import PlayerDetail from './pages/PlayerDetail.jsx';
import Moderation from './pages/Moderation.jsx';
import Cities from './pages/Cities.jsx';
import Purchases from './pages/Purchases.jsx';
import Games from './pages/Games.jsx';
import Settings from './pages/Settings.jsx';
import Shell from './Shell.jsx';
import { GameProvider } from './games.jsx';

export default function App() {
    const [me, setMe] = useState(null); // null = still loading

    useEffect(() => {
        fetch('/auth/me')
            .then((r) => r.json())
            .then(setMe)
            .catch(() => setMe({ authenticated: false }));
    }, []);

    if (me === null) return <div className="loading">Loading…</div>;

    if (!me.authenticated) {
        return (
            <Routes>
                <Route path="*" element={<Login />} />
            </Routes>
        );
    }

    return (
        <GameProvider>
            <Shell profile={me}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/announce" element={<Announce profile={me} />} />
                    <Route path="/players" element={<Players />} />
                    <Route path="/players/:userId" element={<PlayerDetail />} />
                    <Route path="/moderation" element={<Moderation />} />
                    <Route path="/cities" element={<Cities />} />
                    <Route path="/purchases" element={<Purchases />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Shell>
        </GameProvider>
    );
}
