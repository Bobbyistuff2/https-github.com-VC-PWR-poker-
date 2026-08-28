import { useId } from 'react';
import './RankBadge.css';

const TIER_META = {
  Bronze: { from: '#c98a4b', to: '#6b3f16', stroke: '#4a2c0f' },
  Silver: { from: '#d7dbe2', to: '#6f7680', stroke: '#4d525a' },
  Gold: { from: '#f3e4b8', to: '#9c7c3b', stroke: '#6b5527' },
  Platinum: { from: '#8ff0e6', to: '#1f8f86', stroke: '#14615b' },
  Diamond: { from: '#a9c3ff', to: '#4a63d6', stroke: '#33449c' },
  Elite: { from: '#d9f2ff', to: '#3d8fc4', stroke: '#256a95' },
  Master: { from: '#e3b3ff', to: '#8a2fb0', stroke: '#5f1f79' },
  Champion: { from: '#ffb3ec', to: '#c41ea3', stroke: '#8a1372' },
  Grandmaster: { from: '#ffb28a', to: '#c4361f', stroke: '#8a2513' },
  // The top of the ladder gets a third gradient stop (white → gold → pink)
  // instead of a plain two-color fade, so it reads as a step up in kind,
  // not just another color.
  Unreal: { from: '#ffffff', mid: '#ffe066', to: '#ff8ad8', stroke: '#b8860b' },
};

const ROMAN = { 1: 'I', 2: 'II', 3: 'III' };

// `size`: "compact" (icon + tiny division mark, for tight spots like a
// table seat) or "full" (icon + full label, for the lobby header etc).
export default function RankBadge({ rank, size = 'compact' }) {
  const gradId = useId();
  if (!rank) return null;
  const meta = TIER_META[rank.tier] || TIER_META.Bronze;

  return (
    <span
      className={`rank-badge rank-badge--${size} rank-badge--${rank.tier.toLowerCase()}`}
      title={rank.label}
    >
      <svg viewBox="0 0 24 24" className="rank-badge__icon" aria-hidden="true">
        <defs>
          <linearGradient id={`rankgrad-${gradId}`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={meta.from} />
            {meta.mid && <stop offset="50%" stopColor={meta.mid} />}
            <stop offset="100%" stopColor={meta.to} />
          </linearGradient>
        </defs>
        <path
          d="M12 1.6 3.6 4.8v6.1c0 5.4 3.7 9.3 8.4 10.5 4.7-1.2 8.4-5.1 8.4-10.5V4.8L12 1.6Z"
          fill={`url(#rankgrad-${gradId})`}
          stroke={meta.stroke}
          strokeWidth="1"
        />
      </svg>
      {size === 'full' ? (
        <span className="rank-badge__label">{rank.label}</span>
      ) : (
        rank.division && <span className="rank-badge__division">{ROMAN[rank.division]}</span>
      )}
    </span>
  );
}
