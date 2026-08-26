import './PlayingCard.css';

const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

export default function PlayingCard({ card, faceDown, size = 'md' }) {
  if (faceDown || !card) {
    return <div className={`playing-card playing-card--back playing-card--${size}`} />;
  }
  const color = RED_SUITS.has(card.suit) ? 'red' : 'black';
  return (
    <div className={`playing-card playing-card--${size} playing-card--${color}`}>
      <span className="playing-card__rank">{card.rank}</span>
      <span className="playing-card__suit">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}
