import { useState } from 'react';
import { formatChips } from '../chips.js';
import './HandHistory.css';

// Mirrors HandRankings.jsx's toggle+slide-over pattern, parked on the
// opposite side of the screen so the two don't collide.
export default function HandHistory({ history, mySeatIndex }) {
  const [open, setOpen] = useState(false);
  const hands = history || [];

  return (
    <>
      <button
        className={`hand-history-toggle ${open ? 'hand-history-toggle--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <HistoryIcon />
        <span>Recent Hands</span>
      </button>

      <div className={`hand-history-panel ${open ? 'hand-history-panel--open' : ''}`}>
        <div className="hand-history-panel__header">
          <h2>Recent Hands</h2>
          <span className="hand-history-panel__hint">Last {hands.length || 0}</span>
        </div>
        {hands.length === 0 ? (
          <p className="hand-history-empty">No hands played yet this session.</p>
        ) : (
          <ol className="hand-history-list">
            {hands.map((h) => (
              <li key={h.handNumber} className="hand-history-item">
                <div className="hand-history-item__head">
                  <span className="hand-history-item__num">Hand #{h.handNumber}</span>
                  <span className="hand-history-item__pot">Pot {formatChips(h.pot)}</span>
                </div>
                {h.payouts.length === 0 ? (
                  <div className="hand-history-item__line">No winner recorded</div>
                ) : (
                  h.payouts.map((p, i) => (
                    <div
                      key={i}
                      className={`hand-history-item__line ${p.seatIndex === mySeatIndex ? 'hand-history-item__line--me' : ''}`}
                    >
                      {p.name} won {formatChips(p.amount)}
                      {p.hand ? ` with ${p.hand}` : ''}
                    </div>
                  ))
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
