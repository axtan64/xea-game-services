import { useState } from 'react';
import { api } from '../api.js';
import { MessagingWarning, Notice, PageHead } from '../components.jsx';
import { useGame } from '../games.jsx';
import { byteLength, timeAgo } from '../format.js';

// The game clips anything longer (Services/Admin/Notices' MAX_TEXT, in bytes)
const MAX_BYTES = 300;

// A sketch of the in-game banner (Systems/UI/Announcement/AnnouncementBanner), so the words can be read as players will see them
function BannerPreview({ message, fromTeam, profile }) {
    const name = fromTeam ? 'The developers' : profile?.name || profile?.username || 'You';

    return (
        <div className="banner-preview">
            <div className="banner-ribbon">📣 DEVELOPER ANNOUNCEMENT <span className="banner-scope">GLOBAL</span></div>
            <div className="banner-body">
                {fromTeam && <div className="avatar avatar-fallback">🏙️</div>}
                {!fromTeam && (profile?.picture
                    ? <img className="avatar" src={profile.picture} alt="" />
                    : <div className="avatar avatar-fallback">{name[0]}</div>)}
                <div className="banner-text">
                    <div className="banner-sender">{name} <span className="badge purple">DEVELOPER</span></div>
                    <div className="banner-message">{message || <span className="muted">Your announcement</span>}</div>
                </div>
            </div>
        </div>
    );
}

export default function Announce({ profile }) {
    const { game } = useGame();
    const [message, setMessage] = useState('');
    const [fromTeam, setFromTeam] = useState(false);
    const [status, setStatus] = useState(null);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState([]);
    const [restartStatus, setRestartStatus] = useState(null);
    const [restarting, setRestarting] = useState(false);
    const bytes = byteLength(message.trim());

    // Every live server saves and moves its players on to a fresh one (Systems/Shutdown/SoftRestarting in the game)
    async function restart() {
        if (!game) return;
        const question = `Soft restart every live server of ${game.name}? Everyone is teleported to a fresh server `
            + 'running the latest published version: cities save first and their players arrive in the same city.';
        if (!window.confirm(question)) return;

        setRestarting(true);
        try {
            await api(`/api/games/${game.slug}/restart`, { method: 'POST' });
            setRestartStatus({ ok: true, message: 'Sent. Every live server moves its players on within a few seconds.' });
        } catch (err) {
            setRestartStatus({ ok: false, message: err.message });
        } finally {
            setRestarting(false);
        }
    }

    async function send(e) {
        e.preventDefault();
        if (!game || !message.trim() || bytes > MAX_BYTES) return;
        if (!window.confirm(`Show this to everyone in every live server of ${game.name}?`)) return;

        setSending(true);
        try {
            await api(`/api/games/${game.slug}/announce`, { method: 'POST', body: { message, fromTeam } });
            setSent((previous) => [{ message: message.trim(), at: new Date(), game: game.name }, ...previous]);
            setMessage('');
            setStatus({ ok: true, message: 'Sent. Every live server shows it within a few seconds.' });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="page">
            <PageHead title="Announce" />
            <p className="muted">
                A banner across the top of every player's screen in every live server of {game?.name ?? 'the game'},
                with a chime, as <span className="mono">/announce global</span> shows it. It isn't kept: players who
                join later don't see it.
            </p>
            <MessagingWarning />

            <form onSubmit={send}>
                <label className="field">
                    <span className="field-label">Message</span>
                    <textarea
                        className="input textarea"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="The city servers restart in 5 minutes for an update!"
                    />
                    <span className={`counter ${bytes > MAX_BYTES ? 'red-text' : 'muted'}`}>{bytes} / {MAX_BYTES}</span>
                </label>

                <div className="field">
                    <span className="field-label">From</span>
                    <label className="check">
                        <input type="radio" checked={!fromTeam} onChange={() => setFromTeam(false)} />
                        Me: my headshot and name
                    </label>
                    <label className="check">
                        <input type="radio" checked={fromTeam} onChange={() => setFromTeam(true)} />
                        The developers: the game's icon
                    </label>
                </div>

                <BannerPreview message={message.trim()} fromTeam={fromTeam} profile={profile} />

                <button className="primary" type="submit" disabled={sending || !message.trim() || bytes > MAX_BYTES}>
                    {sending ? 'Sending…' : 'Send to every server'}
                </button>
            </form>
            <Notice status={status} />

            {sent.length > 0 && (
                <>
                    <div className="section-title">Sent from this page</div>
                    <ul className="list">
                        {sent.map((entry) => (
                            <li key={entry.at.getTime()}>
                                <span className="muted">{timeAgo(entry.at)} · {entry.game}</span>
                                <div>{entry.message}</div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className="section-title">Restart every server</div>
            <p className="muted">
                A soft restart: every live server of {game?.name ?? 'the game'} saves, shows its players the shutdown
                screen and teleports them on to a fresh server running the latest published version. A city's players
                arrive in the same city, the lobby's in a new lobby, each where they stood. Announce it a few minutes
                ahead if you can.
            </p>
            <button className="button danger" type="button" disabled={restarting || !game} onClick={restart}>
                {restarting ? 'Restarting…' : 'Soft restart every server'}
            </button>
            <Notice status={restartStatus} />
        </div>
    );
}