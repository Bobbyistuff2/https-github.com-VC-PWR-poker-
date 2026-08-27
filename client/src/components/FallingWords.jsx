import { useMemo } from 'react';
import './FallingWords.css';

const WORDS = ['Flush', 'Straight', 'Full House', 'Quads', 'Trips', 'Royal Flush', 'All In', 'Two Pair'];
const COLORS = ['#c9a961', '#f3e4b8', '#9c7c3b', '#f2f1ec'];

function randomWord(i) {
  // wide spread so some words drift lazily while others rush past
  const duration = 8 + Math.random() * 24;
  return {
    key: i,
    text: WORDS[Math.floor(Math.random() * WORDS.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    left: Math.random() * 100,
    // negative delay starts the animation already in progress, so words
    // are mid-fall the instant the page loads instead of an empty sky
    delay: -Math.random() * duration,
    duration,
    scale: 0.75 + Math.random() * 0.5,
    tilt: (Math.random() - 0.5) * 30,
    drift: (Math.random() - 0.5) * 180,
  };
}

export default function FallingWords({ count = 14 }) {
  const words = useMemo(() => Array.from({ length: count }, (_, i) => randomWord(i)), [count]);

  return (
    <div className="falling-words" aria-hidden="true">
      {words.map((w) => (
        <div
          key={w.key}
          className="falling-word"
          style={{
            left: `${w.left}%`,
            color: w.color,
            animationDelay: `${w.delay}s`,
            animationDuration: `${w.duration}s`,
            '--scale': w.scale,
            '--tilt': `${w.tilt}deg`,
            '--drift': `${w.drift}px`,
          }}
        >
          {w.text}
        </div>
      ))}
    </div>
  );
}
