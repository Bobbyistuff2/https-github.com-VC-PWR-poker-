import { useState } from 'react';
import './HandRankings.css';

const RANKINGS = [
  { name: 'High Card', desc: 'No matches — the highest single card plays.' },
  { name: 'Pair', desc: 'Two cards of the same rank.' },
  { name: 'Two Pair', desc: 'Two separate pairs.' },
  { name: 'Three of a Kind', desc: 'Three cards of the same rank.' },
  { name: 'Straight', desc: 'Five cards in sequence, mixed suits.' },
  { name: 'Flush', desc: 'Five cards of the same suit, not in sequence.' },
  { name: 'Full House', desc: 'Three of a kind plus a pair.' },
  { name: 'Four of a Kind', desc: 'Four cards of the same rank.' },
  { name: 'Straight Flush', desc: 'Five sequential cards, all the same suit.' },
];

export default function HandRankings() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={`hand-rankings-toggle ${open ? 'hand-rankings-toggle--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <RankIcon />
        <span>Hand Rankings</span>
      </button>

      <div className={`hand-rankings-panel ${open ? 'hand-rankings-panel--open' : ''}`}>
        <div className="hand-rankings-panel__header">
          <h2>Hand Rankings</h2>
          <span className="hand-rankings-panel__hint">Worst → Best</span>
        </div>
        <ol className="hand-rankings-list">
          {RANKINGS.map((r, i) => (
            <li key={r.name} className="hand-rankings-list__item">
              <span className="hand-rankings-list__num">{i + 1}</span>
              <div>
                <div className="hand-rankings-list__name">{r.name}</div>
                <div className="hand-rankings-list__desc">{r.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

function RankIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V10" />
      <path d="M10 19V4" />
      <path d="M16 19v-7" />
      <path d="M4 19h16" opacity="0" />
    </svg>
  );
}
