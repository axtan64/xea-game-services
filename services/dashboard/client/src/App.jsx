import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Settings from './pages/Settings.jsx';
import Shell from './Shell.jsx';

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
        <Shell profile={me}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Shell>
    );
}