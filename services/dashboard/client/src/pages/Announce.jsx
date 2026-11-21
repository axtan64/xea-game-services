import { useState } from 'react';
import { api } from '../api.js';
import { GameTopic, MessagingWarning, Notice, Page, SectionTitle } from '../components.jsx';
import { useGame } from '../games.jsx';
import { Icon } from '../icons.jsx';
import { useConfirm } from '../ui.jsx';
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
                {fromTeam && <div className="banner-avatar">🏙️</div>}
                {!fromTeam && (profile?.picture
                    ? <img className="banner-avatar" src={profile.picture} alt="" />
                    : <div className="banner-avatar">{name[0]}</div>)}
                <div className="banner-text">
                    <div className="banner-sender">{name} <span className="banner-tag">DEVELOPER</span></div>
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
    const confirm = useConfirm();

    // Every live server saves and moves its players on to a fresh one (Systems/Shutdown/SoftRestarting in the game)
    async function restart() {
        if (!game) return;
        const asked = await confirm({
            title: 'Soft restart every server',
            body: `Every live server of ${game.name} saves, and everyone is teleported to a fresh server running the latest `
                + 'published version: a city\'s players arrive in the same city.',
            confirmLabel: 'Restart every server',
            danger: true,
        });
        if (!asked) return;

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
        const asked = await confirm({
            title: 'Send this announcement',
            body: `Show it to everyone in every live server of ${game.name}? It can't be taken back once sent.`,
            confirmLabel: 'Send',
        });
        if (!asked) return;

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
        <Page title="Announce" icon="megaphone" topic={<GameTopic />}>
            <p className="lead">
                A banner across the top of every player's screen in every live server of {game?.name ?? 'the game'},
                with a chime, as <span className="code">/announce global</span> shows it. It isn't kept: players who
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
                    <div className="radio-group" role="radiogroup">
                        <label className={`radio ${!fromTeam ? 'checked' : ''}`}>
                            <input type="radio" name="from" checked={!fromTeam} onChange={() => setFromTeam(false)} />
                            <span>Me<span className="radio-sub">My headshot and name</span></span>
                        </label>
                        <label className={`radio ${fromTeam ? 'checked' : ''}`}>
                            <input type="radio" name="from" checked={fromTeam} onChange={() => setFromTeam(true)} />
                            <span>The developers<span className="radio-sub">The game's icon</span></span>
                        </label>
                    </div>
                </div>

                <div className="field">
                    <span className="field-label">Preview</span>
                    <BannerPreview message={message.trim()} fromTeam={fromTeam} profile={profile} />
                </div>

                <button className="button brand" type="submit" disabled={sending || !message.trim() || bytes > MAX_BYTES}>
                    <Icon name="megaphone" size={16} />
                    {sending ? 'Sending…' : 'Send to every server'}
                </button>
            </form>
            <Notice status={status} />

            {sent.length > 0 && (
                <>
                    <SectionTitle>Sent from this page</SectionTitle>
                    <div className="card">
                        <ul className="list">
                            {sent.map((entry) => (
                                <li className="list-row sent" key={entry.at.getTime()}>
                                    <span className="grow">{entry.message}</span>
                                    <span className="muted nowrap">{timeAgo(entry.at)} · {entry.game}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}

            <SectionTitle>Restart every server</SectionTitle>
            <div className="card">
                <p className="hint">
                    A soft restart: every live server of {game?.name ?? 'the game'} saves, shows its players the shutdown
                    screen and teleports them on to a fresh server running the latest published version. A city's players
                    arrive in the same city, the lobby's in a new lobby, each where they stood. Announce it a few minutes
                    ahead if you can.
                </p>
                <button className="button danger" type="button" disabled={restarting || !game} onClick={restart}>
                    <Icon name="refresh" size={16} />
                    {restarting ? 'Restarting…' : 'Soft restart every server'}
                </button>
                <Notice status={restartStatus} />
            </div>
        </Page>
    );
}