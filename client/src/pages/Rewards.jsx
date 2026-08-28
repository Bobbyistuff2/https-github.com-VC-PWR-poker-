import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatChips } from '../chips.js';
import './Rewards.css';

export default function Rewards({ user }) {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    api
      .getAchievements()
      .then(({ achievements }) => setAchievements(achievements))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const unlockedCount = achievements ? achievements.filter((a) => a.unlocked).length : 0;

  return (
    <div className="rewards-page">
      <header className="rewards-header">
        <button className="rewards-header__back" onClick={() => navigate('/lobby')}>
          <span className="rewards-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="rewards-header__title">Rewards</h1>
        <div className="rewards-header__count">
          {achievements ? `${unlockedCount}/${achievements.length}` : ''}
        </div>
      </header>

      <main className="rewards-main">
        {error && <p className="rewards-error">{error}</p>}
        {!achievements ? (
          <p className="rewards-loading">Loading rewards…</p>
        ) : (
          <ul className="rewards-list">
            {achievements.map((a) => (
              <li key={a.id} className={`rewards-card ${a.unlocked ? 'rewards-card--unlocked' : ''}`}>
                <div className="rewards-card__icon">{a.unlocked ? <TrophyIcon /> : <LockIcon />}</div>
                <div className="rewards-card__text">
                  <div className="rewards-card__title">{a.title}</div>
                  <div className="rewards-card__desc">{a.description}</div>
                </div>
                <div className="rewards-card__reward">+{formatChips(a.reward)}</div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3" />
      <path d="M16 5h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 17h4v3h-4z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
