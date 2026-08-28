import { useEffect, useState } from 'react';
import RankBadge from './RankBadge.jsx';
import { api } from '../api.js';
import './PlayerStatsModal.css';

// Pass `userId` to open (any falsy value keeps it closed) — used from both
// the Leaderboard (clicking a row) and the Table (clicking a seat), so
// clicking someone else — or yourself — never navigates away from a hand
// in progress.
export default function PlayerStatsModal({ userId, onClose }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    setStats(null);
    setError('');
    api
      .getStats(userId)
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="stats-modal-backdrop" onClick={onClose}>
      <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
        <button className="stats-modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {error && <p className="stats-modal__error">{error}</p>}
        {!stats && !error && <p className="stats-modal__loading">Loading stats…</p>}

        {stats && (
          <>
            <div className="stats-modal__header">
              {stats.picture ? (
                <img className="stats-modal__avatar" src={stats.picture} alt="" />
              ) : (
                <div className="stats-modal__avatar stats-modal__avatar--fallback">
                  {stats.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="stats-modal__name">{stats.name}</div>
              <RankBadge rank={stats.rank} size="full" />
            </div>

            <div className="stats-modal__grid">
              <StatTile label="Chips" value={stats.chips.toLocaleString()} />
              <StatTile label="Win Rate" value={`${stats.winPct}%`} accent />
              <StatTile label="Hands Won" value={stats.handsWon} />
              <StatTile label="Hands Played" value={stats.handsPlayed} />
              <StatTile label="Current Streak" value={stats.currentStreak} />
              <StatTile label="Best Streak" value={stats.bestStreak} />
              <StatTile label="Biggest Win" value={stats.biggestWin.toLocaleString()} />
              <StatTile label="Achievements" value={`${stats.achievementsUnlocked}/${stats.achievementsTotal}`} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className={`stats-tile ${accent ? 'stats-tile--accent' : ''}`}>
      <div className="stats-tile__value">{value}</div>
      <div className="stats-tile__label">{label}</div>
    </div>
  );
}
