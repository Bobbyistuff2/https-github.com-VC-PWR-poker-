import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RankBadge from '../components/RankBadge.jsx';
import PlayerStatsModal from '../components/PlayerStatsModal.jsx';
import { api } from '../api.js';
import { formatChips } from '../chips.js';
import './Leaderboard.css';

export default function Leaderboard({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [statsUserId, setStatsUserId] = useState(null);

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

  const podium = data?.leaderboard.slice(0, 3) || [];
  const rest = data?.leaderboard.slice(3) || [];
  // Visual left-to-right order: 2nd, 1st (raised), 3rd — filtered so it
  // still looks right with fewer than 3 players on the board.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
  const meInTop = data?.me && data.leaderboard.some((e) => e.id === data.me.id);

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-glow" aria-hidden="true" />
      <header className="leaderboard-header">
        <button className="leaderboard-header__back" onClick={() => navigate('/lobby')}>
          <span className="leaderboard-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="leaderboard-header__title">
          <CrownIcon /> Leaderboard
        </h1>
        <div className="leaderboard-header__spacer" />
      </header>

      <main className="leaderboard-main">
        {error && <p className="leaderboard-error">{error}</p>}
        {!data ? (
          <p className="leaderboard-loading">Loading leaderboard…</p>
        ) : (
          <>
            {podiumOrder.length > 0 && (
              <div className={`leaderboard-podium leaderboard-podium--count${podiumOrder.length}`}>
                {podiumOrder.map((entry) => (
                  <PodiumCard
                    key={entry.id}
                    entry={entry}
                    isMe={entry.id === user.id}
                    onClick={() => setStatsUserId(entry.id)}
                  />
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <ol className="leaderboard-list" start={4}>
                {rest.map((entry) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    isMe={entry.id === user.id}
                    onClick={() => setStatsUserId(entry.id)}
                  />
                ))}
              </ol>
            )}

            {data.me && !meInTop && (
              <>
                <div className="leaderboard-divider">Your position</div>
                <ol className="leaderboard-list" start={data.me.position}>
                  <LeaderboardRow entry={data.me} isMe onClick={() => setStatsUserId(data.me.id)} />
                </ol>
              </>
            )}
          </>
        )}
      </main>

      <PlayerStatsModal userId={statsUserId} onClose={() => setStatsUserId(null)} />
    </div>
  );
}

const TIER_GLOW = {
  Bronze: 'rgba(201, 138, 79, 0.35)',
  Silver: 'rgba(215, 219, 226, 0.35)',
  Gold: 'rgba(243, 228, 184, 0.4)',
  Platinum: 'rgba(143, 240, 230, 0.35)',
  Diamond: 'rgba(169, 195, 255, 0.35)',
  Master: 'rgba(227, 179, 255, 0.4)',
  Grandmaster: 'rgba(255, 178, 138, 0.45)',
};

function PodiumCard({ entry, isMe, onClick }) {
  const glow = TIER_GLOW[entry.rank.tier] || TIER_GLOW.Bronze;
  return (
    <button
      type="button"
      className={`leaderboard-podium__card leaderboard-podium__card--p${entry.position} ${
        isMe ? 'leaderboard-podium__card--me' : ''
      }`}
      style={{ '--tier-glow': glow }}
      onClick={onClick}
    >
      <MedalIcon place={entry.position} size={entry.position === 1 ? 30 : 24} />
      {entry.picture ? (
        <img className="leaderboard-podium__avatar" src={entry.picture} alt="" />
      ) : (
        <div className="leaderboard-podium__avatar leaderboard-podium__avatar--fallback">
          {entry.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="leaderboard-podium__name">{entry.name}</div>
      <RankBadge rank={entry.rank} size="full" />
      <div className="leaderboard-podium__chips">{formatChips(entry.chips)}</div>
      <div className="leaderboard-podium__stand">{entry.position}</div>
    </button>
  );
}

function LeaderboardRow({ entry, isMe, onClick }) {
  const glow = TIER_GLOW[entry.rank.tier] || TIER_GLOW.Bronze;
  return (
    <li className={`leaderboard-row ${isMe ? 'leaderboard-row--me' : ''}`} style={{ '--tier-glow': glow }}>
      <button type="button" className="leaderboard-row__click" onClick={onClick}>
      <span className="leaderboard-row__position">#{entry.position}</span>
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
        <span className="leaderboard-row__chips">{formatChips(entry.chips)}</span>
        <span className="leaderboard-row__wins">{entry.handsWon} wins</span>
      </div>
      </button>
    </li>
  );
}

function MedalIcon({ place, size = 20 }) {
  const colors = { 1: '#f3e4b8', 2: '#d7dbe2', 3: '#c98a4b' };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="leaderboard-medal">
      <circle cx="12" cy="14" r="7" fill={colors[place]} stroke="#0a0904" strokeWidth="1" />
      <path d="M9 2 12 9 15 2" stroke={colors[place]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="17.5" fontSize="8" fontWeight="800" fill="#0a0904" textAnchor="middle">
        {place}
      </text>
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
      <path d="M5 21h14" />
    </svg>
  );
}
