import './PlayingCard.css';

const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

export default function PlayingCard({ card, faceDown, size = 'md', skin = 'cards-classic' }) {
  if (faceDown || !card) {
    return <div className={`playing-card playing-card--back playing-card--${size} playing-card--${skin}`} />;
  }
  const color = RED_SUITS.has(card.suit) ? 'red' : 'black';
  return (
    <div className={`playing-card playing-card--${size} playing-card--${color} playing-card--${skin}`}>
      <span className="playing-card__rank">{card.rank}</span>
      <span className="playing-card__suit">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}
