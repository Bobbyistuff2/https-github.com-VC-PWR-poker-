import PlayingCard from './PlayingCard.jsx';
import Chip from './Chip.jsx';
import { formatChips, decomposeChips } from '../chips.js';
import './Seat.css';

export default function Seat({ seat, position, isDealer, isTurn, isMe }) {
  return (
    <div className={`seat seat--pos${position} ${seat.folded ? 'seat--folded' : ''} ${isTurn ? 'seat--turn' : ''}`}>
      {isDealer && <div className="seat__dealer">D</div>}
      <div className={`seat__avatar ${isMe ? 'seat__avatar--me' : ''} ${seat.isBot ? 'seat__avatar--bot' : ''}`}>
        {seat.isBot ? (
          <span>🤖</span>
        ) : seat.picture ? (
          <img src={seat.picture} alt="" />
        ) : (
          <span>{seat.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="seat__name">{seat.name}</div>
      <div className="seat__chips">{formatChips(seat.chips)}</div>

      {seat.hasCards && (
        <div className="seat__cards">
          {seat.holeCards.length > 0 ? (
            seat.holeCards.map((c, i) => <PlayingCard key={i} card={c} size="sm" />)
          ) : (
            <>
              <PlayingCard faceDown size="sm" />
              <PlayingCard faceDown size="sm" />
            </>
          )}
        </div>
      )}

      {seat.allIn && <div className="seat__tag seat__tag--allin">ALL IN!</div>}
      {seat.folded && <div className="seat__tag">Folded</div>}

      {seat.betThisRound > 0 && (
        <div className="seat__bet">
          <div className="seat__bet-total">{formatChips(seat.betThisRound)}</div>
          <div className="seat__bet-stacks">
            {decomposeChips(seat.betThisRound).map((d) => (
              <div key={d.value} className="seat__bet-group">
                {Array.from({ length: d.count }).map((_, i) => (
                  <div key={i} className="seat__bet-chip">
                    <Chip value={d.value} color={d.color} text={d.text} size="sm" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
