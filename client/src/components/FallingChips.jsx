import { useMemo } from 'react';
import { DENOMINATIONS } from '../chips.js';
import './FallingChips.css';

function randomChip(i) {
  const denom = DENOMINATIONS[Math.floor(Math.random() * DENOMINATIONS.length)];
  const duration = 11 + Math.random() * 13;
  return {
    key: i,
    color: denom.color,
    text: denom.text,
    left: Math.random() * 100,
    // negative delay starts the animation already in progress, so chips
    // are mid-fall the instant the page loads instead of an empty sky
    delay: -Math.random() * duration,
    duration,
    scale: 0.8 + Math.random() * 0.5,
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    drift: (Math.random() - 0.5) * 220,
  };
}

export default function FallingChips({ count = 22 }) {
  const chips = useMemo(() => Array.from({ length: count }, (_, i) => randomChip(i)), [count]);

  return (
    <div className="falling-chips" aria-hidden="true">
      {chips.map((c) => (
        <div
          key={c.key}
          className="falling-chip"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            '--scale': c.scale,
            '--spin': `${c.spin}deg`,
            '--drift': `${c.drift}px`,
          }}
        >
          <div className="mini-chip" style={{ background: c.color, color: c.text }}>
            <div className="mini-chip__ring" />
          </div>
        </div>
      ))}
    </div>
  );
}
