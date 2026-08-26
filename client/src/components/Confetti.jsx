import { useMemo } from 'react';
import './Confetti.css';

const COLORS = ['#ff3d81', '#ffe135', '#22d3ee', '#ff8a3d', '#7c5cff', '#4ade80'];

export default function Confetti({ count = 18 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i + (Math.random() * 20 - 10);
        const distance = 110 + Math.random() * 150;
        const rad = (angle * Math.PI) / 180;
        return {
          key: i,
          color: COLORS[i % COLORS.length],
          tx: Math.cos(rad) * distance,
          ty: Math.sin(rad) * distance,
          rot: Math.random() * 720 - 360,
          delay: Math.random() * 0.12,
          size: 0.4 + Math.random() * 0.4,
        };
      }),
    [count]
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti__piece"
          style={{
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            '--rot': `${p.rot}deg`,
            '--piece-color': p.color,
            '--size': `${p.size}rem`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
