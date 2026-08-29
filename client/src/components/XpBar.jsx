import RankBadge from './RankBadge.jsx';
import './XpBar.css';

// Reads straight off the rank object the server already computes
// (rank.progressPct / rank.next.xpNeeded) — no XP-ladder knowledge needed
// on the client, see ranks.js.
//
// `size`: "compact" (the small bar next to the avatar in the lobby header)
// or "hero" (a bigger, standalone banner — e.g. above the gamemode picker).
export default function XpBar({ rank, size = 'compact' }) {
  if (!rank) return null;

  if (size === 'hero') {
    return (
      <div className="xp-bar xp-bar--hero">
        <div className="xp-bar__hero-top">
          <div className="xp-bar__hero-rank">
            <RankBadge rank={rank} size="full" />
          </div>
          <div className="xp-bar__hero-next">
            {rank.next
              ? `${rank.next.xpNeeded.toLocaleString()} XP to ${rank.next.label}`
              : 'Max rank reached'}
          </div>
        </div>
        <div className="xp-bar__track xp-bar__track--hero">
          <div className="xp-bar__fill" style={{ width: `${rank.progressPct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="xp-bar">
      <div className="xp-bar__track">
        <div className="xp-bar__fill" style={{ width: `${rank.progressPct}%` }} />
      </div>
      <div className="xp-bar__label">
        {rank.next ? `${rank.next.xpNeeded.toLocaleString()} XP to ${rank.next.label}` : 'Max rank reached'}
      </div>
    </div>
  );
}
