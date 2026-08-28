import { useEffect } from 'react';
import Confetti from './Confetti.jsx';
import RankBadge from './RankBadge.jsx';
import { playFanfare } from '../audio.js';
import './RankUpCelebration.css';

// A brief full-screen celebration fired once from App.jsx whenever a
// player's derived rank climbs to a new rung on the ladder — see the
// rank-index comparison in App.jsx's wrapped setUser.
export default function RankUpCelebration({ rank, onDone }) {
  useEffect(() => {
    if (!rank) return;
    playFanfare();
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank]);

  if (!rank) return null;

  return (
    <div className="rankup-overlay" onClick={onDone}>
      <Confetti count={32} />
      <div className="rankup-card">
        <p className="rankup-card__eyebrow">Rank Up!</p>
        <div className="rankup-card__badge">
          <RankBadge rank={rank} size="full" />
        </div>
      </div>
    </div>
  );
}
