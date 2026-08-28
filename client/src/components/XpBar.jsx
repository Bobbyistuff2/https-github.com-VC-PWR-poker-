import './XpBar.css';

// Reads straight off the rank object the server already computes
// (rank.progressPct / rank.next.xpNeeded) — no XP-ladder knowledge needed
// on the client, see ranks.js.
export default function XpBar({ rank }) {
  if (!rank) return null;
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
