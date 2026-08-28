import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DealTransition from '../components/DealTransition.jsx';
import FallingChips from '../components/FallingChips.jsx';
import FallingWords from '../components/FallingWords.jsx';
import RankBadge from '../components/RankBadge.jsx';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import './Lobby.css';

const SUBHEADINGS = {
  main: 'Choose how you want to play.',
  cash: 'Real-money tables — coming soon.',
  tournaments: 'Open to everyone. Jump into a table or start your own.',
  quick: 'Fill the table with the AI and jump right in.',
};

export default function Lobby({ user, onSignedOut, onUserUpdate }) {
  const navigate = useNavigate();
  const [view, setView] = useState('main');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [quickBots, setQuickBots] = useState(1);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => onUserUpdate(user))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view !== 'tournaments') return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    function refresh() {
      socket.emit('room:listTournaments', {}, (list) => setTournaments(list || []));
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [view]);

  if (!user) return null;

  async function handleLogout() {
    await api.logout();
    onSignedOut();
    navigate('/');
  }

  function goToView(next) {
    setError('');
    setView(next);
  }

  function handleCreateTournament() {
    setError('');
    setBusy(true);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('room:create', { type: 'tournament' }, (res) => {
      setBusy(false);
      if (res?.error) return setError(res.error);
      navigate(`/table/${res.code}`);
    });
  }

  function handleJoinTournament(code) {
    setError('');
    setBusy(true);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('room:join', { code }, (res) => {
      setBusy(false);
      if (res?.error) return setError(res.error);
      navigate(`/table/${res.code}`);
    });
  }

  function handleQuickGame() {
    setError('');
    setBusy(true);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('room:create', { type: 'quick', botCount: quickBots }, (res) => {
      setBusy(false);
      if (res?.error) return setError(res.error);
      navigate(`/table/${res.code}`);
    });
  }

  return (
    <div className="lobby">
      <DealTransition />
      <FallingChips />
      <FallingWords />
      <div className="lobby__glow" aria-hidden="true" />
      <header className="lobby__header">
        <div className="lobby__user">
          {user.picture ? (
            <img className="lobby__avatar lobby__avatar--bob" src={user.picture} alt="" />
          ) : (
            <div className="lobby__avatar lobby__avatar--fallback lobby__avatar--bob">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="lobby__name-row">
              <div className="lobby__name">{user.name}</div>
              <RankBadge rank={user.rank} size="full" />
            </div>
            <div className="lobby__chips">{user.chips.toLocaleString()} chips</div>
          </div>
          <button className="lobby__icon-btn" onClick={() => navigate('/rewards')} aria-label="Rewards">
            <TrophyIcon />
          </button>
          <button className="lobby__icon-btn" onClick={() => navigate('/wheel')} aria-label="Spin the Wheel">
            <WheelIcon />
          </button>
          <button className="lobby__icon-btn" onClick={() => navigate('/leaderboard')} aria-label="Leaderboard">
            <LeaderboardIcon />
          </button>
        </div>
        <button className="lobby__logout" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <main className="lobby__main">
        <div className="lobby__hero">
          <p className="lobby__eyebrow">Welcome back</p>
          <h1 className="lobby__heading">Ready to play, {user.name}?</h1>
          <p className="lobby__subheading">{SUBHEADINGS[view]}</p>
        </div>

        {view === 'main' && (
          <div className="lobby__modes">
            <button className="lobby__mode lobby__mode--side" onClick={() => goToView('cash')}>
              <div className="lobby__mode-icon">
                <CashIcon />
              </div>
              <h2 className="lobby__mode-title">Cash Games</h2>
              <p className="lobby__mode-text">Play for real stakes.</p>
            </button>

            <button className="lobby__mode lobby__mode--main" onClick={() => goToView('tournaments')}>
              <div className="lobby__mode-icon">
                <TrophyIcon />
              </div>
              <h2 className="lobby__mode-title">Tournaments</h2>
              <p className="lobby__mode-text">Open tables anyone can join — or start your own.</p>
            </button>

            <button className="lobby__mode lobby__mode--side" onClick={() => goToView('quick')}>
              <div className="lobby__mode-icon">
                <BoltIcon />
              </div>
              <h2 className="lobby__mode-title">Quick Game</h2>
              <p className="lobby__mode-text">You vs. the AI.</p>
            </button>
          </div>
        )}

        {view === 'cash' && (
          <div className="lobby__panel">
            <h2 className="lobby__panel-title">Cash Games</h2>
            <p className="lobby__panel-text">There are no cash games going on right now.</p>
            <button className="lobby__back-btn" onClick={() => goToView('main')}>
              <span className="lobby__back-btn__arrow">←</span> Back
            </button>
          </div>
        )}

        {view === 'tournaments' && (
          <div className="lobby__panel">
            <h2 className="lobby__panel-title">Tournaments</h2>
            {tournaments.length === 0 ? (
              <>
                <p className="lobby__panel-text">No tournaments are open right now.</p>
                <button className="lobby__cta" onClick={handleCreateTournament} disabled={busy}>
                  Create a Tournament
                </button>
                <button className="lobby__link" onClick={() => goToView('quick')}>
                  Or play a Quick Game instead →
                </button>
              </>
            ) : (
              <>
                <ul className="lobby__tourney-list">
                  {tournaments.map((t) => (
                    <li key={t.code} className="lobby__tourney-row">
                      <div>
                        <div className="lobby__tourney-host">{t.hostName}&rsquo;s table</div>
                        <div className="lobby__tourney-count">
                          {t.playerCount}/{t.maxSeats} players
                        </div>
                      </div>
                      <button
                        className="lobby__cta lobby__cta--sm"
                        onClick={() => handleJoinTournament(t.code)}
                        disabled={busy}
                      >
                        Join
                      </button>
                    </li>
                  ))}
                </ul>
                <button className="lobby__cta" onClick={handleCreateTournament} disabled={busy}>
                  Create a Tournament
                </button>
              </>
            )}
            <button className="lobby__back-btn" onClick={() => goToView('main')}>
              <span className="lobby__back-btn__arrow">←</span> Back
            </button>
          </div>
        )}

        {view === 'quick' && (
          <div className="lobby__panel">
            <h2 className="lobby__panel-title">Quick Game</h2>
            <p className="lobby__panel-text">Choose how many bots to play against.</p>
            <div className="lobby__bot-choice">
              <button
                className={`lobby__bot-option ${quickBots === 1 ? 'lobby__bot-option--active' : ''}`}
                onClick={() => setQuickBots(1)}
              >
                1 Bot
              </button>
              <button
                className={`lobby__bot-option ${quickBots === 2 ? 'lobby__bot-option--active' : ''}`}
                onClick={() => setQuickBots(2)}
              >
                2 Bots
              </button>
            </div>
            <button className="lobby__cta" onClick={handleQuickGame} disabled={busy}>
              Start Quick Game
            </button>
            <button className="lobby__back-btn" onClick={() => goToView('main')}>
              <span className="lobby__back-btn__arrow">←</span> Back
            </button>
          </div>
        )}

        {error && <p className="lobby__error">{error}</p>}
      </main>
    </div>
  );
}

function CashIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9.5c0-1.1-1.34-2-3-2s-3 .9-3 2 1.34 1.6 3 2 3 .9 3 2-1.34 2-3 2-3-.9-3-2" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3" />
      <path d="M16 5h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 17h4v3h-4z" />
    </svg>
  );
}

function WheelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 3v4M12 17v4M21 12h-4M7 12H3M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8M18.4 18.4l-2.8-2.8M8.4 8.4 5.6 5.6" />
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20V10" />
      <path d="M12 20V4" />
      <path d="M18 20v-7" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
    </svg>
  );
}
