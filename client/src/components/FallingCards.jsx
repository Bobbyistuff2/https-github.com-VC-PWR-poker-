import { useMemo } from 'react';
import './FallingCards.css';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = [
  { symbol: '♠', color: 'black' },
  { symbol: '♣', color: 'black' },
  { symbol: '♥', color: 'red' },
  { symbol: '♦', color: 'red' },
];

function randomCard(i) {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const duration = 11 + Math.random() * 13;
  return {
    key: i,
    rank,
    suit: suit.symbol,
    color: suit.color,
    left: Math.random() * 100,
    // negative delay starts the animation already in progress, so cards
    // are mid-fall the instant the page loads instead of an empty sky
    delay: -Math.random() * duration,
    duration,
    scale: 1 + Math.random() * 0.4,
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    drift: (Math.random() - 0.5) * 220,
  };
}

export default function FallingCards({ count = 24 }) {
  const cards = useMemo(() => Array.from({ length: count }, (_, i) => randomCard(i)), [count]);

  return (
    <div className="falling-cards" aria-hidden="true">
      {cards.map((c) => (
        <div
          key={c.key}
          className="falling-card"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            '--scale': c.scale,
            '--spin': `${c.spin}deg`,
            '--drift': `${c.drift}px`,
          }}
        >
          <div className={`mini-card mini-card--${c.color}`}>
            <span className="mini-card__rank">{c.rank}</span>
            <span className="mini-card__suit">{c.suit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
