import { useEffect, useMemo, useState } from 'react';
import './DealTransition.css';

const RANKS = ['A', 'K', 'Q', 'J', '10'];
const SUITS = [
  { symbol: '♠', color: 'black' },
  { symbol: '♥', color: 'red' },
  { symbol: '♣', color: 'black' },
  { symbol: '♦', color: 'red' },
  { symbol: '♠', color: 'black' },
];

export default function DealTransition() {
  const [mounted, setMounted] = useState(true);
  const cards = useMemo(
    () => RANKS.map((rank, i) => ({ rank, suit: SUITS[i].symbol, color: SUITS[i].color })),
    []
  );

  useEffect(() => {
    const t = setTimeout(() => setMounted(false), 1450);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <div className="deal-transition">
      <div className="deal-transition__wordmark">PWR Poker</div>
      {cards.map((c, i) => (
        <div
          key={i}
          className={`deal-card deal-card--${i}`}
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          <span className={`deal-card__rank deal-card__rank--${c.color}`}>{c.rank}</span>
          <span className={`deal-card__suit deal-card__suit--${c.color}`}>{c.suit}</span>
        </div>
      ))}
    </div>
  );
}
