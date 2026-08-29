import { useMemo } from 'react';
import { DENOMINATIONS } from '../chips.js';
import './ChipRain.css';

// A one-shot burst version of the ambient FallingChips background (see
// FallingChips.jsx) — that one loops forever as lobby decor; this one plays
// once, timed to the ~2s win overlay, so chips visibly rain down over the
// table the moment someone wins a hand.
function randomChip(i) {
  const denom = DENOMINATIONS[Math.floor(Math.random() * DENOMINATIONS.length)];
  const duration = 1.1 + Math.random() * 0.8;
  return {
    key: i,
    color: denom.color,
    text: denom.text,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration,
    scale: 0.65 + Math.random() * 0.5,
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    drift: (Math.random() - 0.5) * 140,
  };
}

export default function ChipRain({ count = 26 }) {
  const chips = useMemo(() => Array.from({ length: count }, (_, i) => randomChip(i)), [count]);

  return (
    <div className="chip-rain" aria-hidden="true">
      {chips.map((c) => (
        <div
          key={c.key}
          className="chip-rain__chip"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            '--scale': c.scale,
            '--spin': `${c.spin}deg`,
            '--drift': `${c.drift}px`,
          }}
        >
          <div className="chip-rain__mini" style={{ background: c.color, color: c.text }}>
            <div className="chip-rain__mini-ring" />
          </div>
        </div>
      ))}
    </div>
  );
}
