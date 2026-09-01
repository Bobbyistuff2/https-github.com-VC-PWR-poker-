import { useMemo } from 'react';
import './Fireworks.css';

// Wheel-exclusive win celebration (see server/shop.js's EXOTIC_ITEMS) — a
// multi-burst version of Confetti.jsx's single center burst: several
// bursts firing from different spots and moments instead of one, each a
// ring of glowing sparks rather than square confetti pieces.
const COLORS = ['#ff5fa2', '#ffd400', '#2ecc71', '#2e6ff2', '#ff8c1a', '#a855f7'];
const ORIGINS = [
  { x: 25, y: 35, delay: 0 },
  { x: 72, y: 22, delay: 0.22 },
  { x: 45, y: 58, delay: 0.44 },
  { x: 80, y: 62, delay: 0.66 },
];
const SPARKS_PER_BURST = 14;

function buildBurst(burstIndex, originX, originY, delay) {
  return Array.from({ length: SPARKS_PER_BURST }, (_, i) => {
    const angle = (360 / SPARKS_PER_BURST) * i + (Math.random() * 12 - 6);
    const distance = 55 + Math.random() * 85;
    const rad = (angle * Math.PI) / 180;
    return {
      key: `${burstIndex}-${i}`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      originX,
      originY,
      tx: Math.cos(rad) * distance,
      ty: Math.sin(rad) * distance,
      delay: delay + Math.random() * 0.06,
      size: 0.3 + Math.random() * 0.35,
    };
  });
}

export default function Fireworks() {
  const sparks = useMemo(() => ORIGINS.flatMap((o, i) => buildBurst(i, o.x, o.y, o.delay)), []);

  return (
    <div className="fireworks" aria-hidden="true">
      {sparks.map((s) => (
        <span
          key={s.key}
          className="fireworks__spark"
          style={{
            left: `${s.originX}%`,
            top: `${s.originY}%`,
            '--tx': `${s.tx}px`,
            '--ty': `${s.ty}px`,
            '--spark-color': s.color,
            '--size': `${s.size}rem`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
