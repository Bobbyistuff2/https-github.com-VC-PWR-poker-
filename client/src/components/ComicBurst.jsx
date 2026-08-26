import { useMemo } from 'react';

export default function ComicBurst({ className }) {
  const points = useMemo(() => {
    const spikes = 12;
    const outerR = 50;
    const innerR = 33;
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      pts.push(`${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="comicBurstGradient">
          <stop offset="0%" stopColor="#ffe135" />
          <stop offset="100%" stopColor="#ff8a3d" />
        </radialGradient>
      </defs>
      <polygon
        points={points}
        fill="url(#comicBurstGradient)"
        stroke="#1a1108"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
