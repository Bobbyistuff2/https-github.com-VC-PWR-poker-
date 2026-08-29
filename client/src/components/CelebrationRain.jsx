import { useMemo } from 'react';
import './CelebrationRain.css';

// One-shot win-celebration rain, alongside ChipRain.jsx (kept separate
// since chips have their own denomination-colored look tied into the shop
// swatch elsewhere). This one covers the other purchasable celebrations —
// see server/shop.js's CELEBRATIONS — picked by `variant`:
//   'cards'    — mini playing cards, matching FallingCards.jsx's look
//   'diamonds' — 💎
//   'money'    — cash emoji
//   'orbs'     — soft glowing circles, no emoji
const EMOJI = {
  diamonds: ['💎'],
  money: ['💵', '💰', '💸'],
};

const RANKS = ['A', 'K', 'Q', 'J', '10', '7'];
const SUITS = [
  { symbol: '♠', color: 'black' },
  { symbol: '♥', color: 'red' },
  { symbol: '♦', color: 'red' },
  { symbol: '♣', color: 'black' },
];

function randomPiece(variant, i) {
  const duration = 1.1 + Math.random() * 0.8;
  const base = {
    key: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration,
    scale: 0.7 + Math.random() * 0.5,
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    drift: (Math.random() - 0.5) * 140,
  };
  if (variant === 'cards') {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return { ...base, rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: suit.symbol, color: suit.color };
  }
  if (variant === 'orbs') return base;
  const list = EMOJI[variant] || EMOJI.diamonds;
  return { ...base, emoji: list[Math.floor(Math.random() * list.length)] };
}

export default function CelebrationRain({ variant, count = 26 }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => randomPiece(variant, i)), [variant, count]);

  return (
    <div className={`celebration-rain celebration-rain--${variant}`} aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.key}
          className="celebration-rain__piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--scale': p.scale,
            '--spin': `${p.spin}deg`,
            '--drift': `${p.drift}px`,
          }}
        >
          {variant === 'cards' ? (
            <div className={`celebration-rain__mini-card celebration-rain__mini-card--${p.color}`}>
              <span>{p.rank}</span>
              <span>{p.suit}</span>
            </div>
          ) : variant === 'orbs' ? (
            <div className="celebration-rain__orb" />
          ) : (
            <span className="celebration-rain__emoji">{p.emoji}</span>
          )}
        </div>
      ))}
    </div>
  );
}
