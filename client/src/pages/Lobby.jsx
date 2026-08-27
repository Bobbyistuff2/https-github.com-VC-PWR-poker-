import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DealTransition from '../components/DealTransition.jsx';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import './Lobby.css';

export default function Lobby({ user, onSignedOut, onUserUpdate }) {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  if (!user) return null;

  async function handleLogout() {
    await api.logout();
    onSignedOut();
    navigate('/');
  }

  function handleCreateTable() {
    setError('');
    setBusy(true);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('room:create', {}, (res) => {
      setBusy(false);
      if (res?.error) return setError(res.error);
      navigate(`/table/${res.code}`);
    });
  }

  function handleJoinTable(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError('');
    setBusy(true);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('room:join', { code: joinCode.trim().toUpperCase() }, (res) => {
      setBusy(false);
      if (res?.error) return setError(res.error);
      navigate(`/table/${res.code}`);
    });
  }

  return (
    <div className="lobby">
      <DealTransition />
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
            <div className="lobby__name">{user.name}</div>
            <div className="lobby__chips">{user.chips.toLocaleString()} chips</div>
          </div>
        </div>
        <button className="lobby__logout" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <main className="lobby__main">
        <p className="lobby__eyebrow">Welcome back</p>
        <h1 className="lobby__heading">Ready to play, {user.name}?</h1>
        <p className="lobby__subheading">
          Start a new table for your friends, or jump into one with a code.
        </p>

        <div className="lobby__cards">
          <div className="lobby__card-float lobby__card-float--a">
            <div className="lobby__card">
              <div className="lobby__card-icon">
                <CreateIcon />
              </div>
              <h2 className="lobby__card-title">Create a Table</h2>
              <p className="lobby__card-text">Start a new game and share the code with friends.</p>
              <button className="lobby__cta" onClick={handleCreateTable} disabled={busy}>
                Create Table
              </button>
            </div>
          </div>

          <div className="lobby__card-float lobby__card-float--b">
            <div className="lobby__card">
              <div className="lobby__card-icon">
                <JoinIcon />
              </div>
              <h2 className="lobby__card-title">Join a Table</h2>
              <p className="lobby__card-text">Enter a code a friend sent you.</p>
              <form className="lobby__join-form" onSubmit={handleJoinTable}>
                <input
                  className="lobby__join-input"
                  placeholder="CODE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  maxLength={5}
                />
                <button className="lobby__cta" type="submit" disabled={busy}>
                  Join Table
                </button>
              </form>
            </div>
          </div>
        </div>

        {error && <p className="lobby__error">{error}</p>}
      </main>
    </div>
  );
}

function CreateIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="14" height="14" rx="2" transform="rotate(-8 10 14)" />
      <path d="M12 3v0a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" opacity="0.5" />
      <path d="M12 3h6a2 2 0 0 1 2 2v9" opacity="0.5" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h13" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}
