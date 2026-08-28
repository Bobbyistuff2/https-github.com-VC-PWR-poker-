import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RankBadge from '../components/RankBadge.jsx';
import { api } from '../api.js';
import './Leaderboard.css';

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    api
      .getLeaderboard()
      .then(setData)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const meInTop = data?.me && data.leaderboard.some((e) => e.id === data.me.id);

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <button className="leaderboard-header__back" onClick={() => navigate('/lobby')}>
          <span className="leaderboard-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="leaderboard-header__title">Leaderboard</h1>
        <div className="leaderboard-header__spacer" />
      </header>

      <main className="leaderboard-main">
        {error && <p className="leaderboard-error">{error}</p>}
        {!data ? (
          <p className="leaderboard-loading">Loading leaderboard…</p>
        ) : (
          <>
            <ol className="leaderboard-list">
              {data.leaderboard.map((entry) => (
                <LeaderboardRow key={entry.id} entry={entry} isMe={entry.id === user.id} />
              ))}
            </ol>

            {data.me && !meInTop && (
              <>
                <div className="leaderboard-divider">Your position</div>
                <ol className="leaderboard-list" start={data.me.position}>
                  <LeaderboardRow entry={data.me} isMe />
                </ol>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function LeaderboardRow({ entry, isMe }) {
  return (
    <li className={`leaderboard-row ${isMe ? 'leaderboard-row--me' : ''}`}>
      <span className="leaderboard-row__position">
        {entry.position <= 3 ? <MedalIcon place={entry.position} /> : `#${entry.position}`}
      </span>
      {entry.picture ? (
        <img className="leaderboard-row__avatar" src={entry.picture} alt="" />
      ) : (
        <div className="leaderboard-row__avatar leaderboard-row__avatar--fallback">
          {entry.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="leaderboard-row__name-col">
        <div className="leaderboard-row__name">{entry.name}</div>
        <RankBadge rank={entry.rank} size="full" />
      </div>
      <div className="leaderboard-row__stats">
        <span className="leaderboard-row__chips">
          <span className="leaderboard-row__chip-dot" />
          {entry.chips.toLocaleString()}
        </span>
        <span className="leaderboard-row__wins">{entry.handsWon} wins</span>
      </div>
    </li>
  );
}

function MedalIcon({ place }) {
  const colors = { 1: '#f3e4b8', 2: '#d7dbe2', 3: '#c98a4b' };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="14" r="7" fill={colors[place]} stroke="#0a0904" strokeWidth="1" />
      <path d="M9 2 12 9 15 2" stroke={colors[place]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="17.5" fontSize="8" fontWeight="800" fill="#0a0904" textAnchor="middle">
        {place}
      </text>
    </svg>
  );
}
