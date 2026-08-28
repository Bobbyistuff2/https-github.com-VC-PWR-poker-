import PlayingCard from './PlayingCard.jsx';
import RankBadge from './RankBadge.jsx';
import { formatChips } from '../chips.js';
import './Seat.css';

export default function Seat({ seat, position, isDealer, isTurn, isMe, actionToast, onViewStats, cardSkin }) {
  const clickable = !seat.isBot && !!onViewStats;
  const AvatarTag = clickable ? 'button' : 'div';

  return (
    <div className={`seat seat--pos${position} ${seat.folded ? 'seat--folded' : ''} ${isTurn ? 'seat--turn' : ''}`}>
      {isDealer && <div className="seat__dealer">D</div>}

      <div className="seat__cluster">
        <AvatarTag
          type={clickable ? 'button' : undefined}
          className={`seat__avatar ${isMe ? 'seat__avatar--me' : ''} ${seat.isBot ? 'seat__avatar--bot' : ''} ${clickable ? 'seat__avatar--clickable' : ''}`}
          onClick={clickable ? () => onViewStats(seat.userId) : undefined}
          aria-label={clickable ? `View ${seat.name}'s stats` : undefined}
        >
          {seat.isBot ? (
            <span>🤖</span>
          ) : seat.picture ? (
            <img src={seat.picture} alt="" />
          ) : (
            <span>{seat.name.charAt(0).toUpperCase()}</span>
          )}
        </AvatarTag>

        {seat.hasCards && (
          <div className="seat__cards">
            {seat.holeCards.length > 0 ? (
              seat.holeCards.map((c, i) => <PlayingCard key={i} card={c} size="xs" skin={cardSkin} />)
            ) : (
              <>
                <PlayingCard faceDown size="xs" skin={cardSkin} />
                <PlayingCard faceDown size="xs" skin={cardSkin} />
              </>
            )}
          </div>
        )}
      </div>

      <div className="seat__name-wrap">
        <RankBadge rank={seat.rank} size="compact" />
        <div className="seat__name">{seat.name}</div>
        {actionToast && (
          <div key={actionToast.id} className="seat__action-toast">
            {actionToast.label}
          </div>
        )}
      </div>
      <div className="seat__chips">{formatChips(seat.chips)}</div>

      {seat.folded ? (
        <div className="seat__tag">Folded</div>
      ) : seat.allIn ? (
        <div className="seat__tag seat__tag--allin">All In!</div>
      ) : seat.betThisRound > 0 ? (
        <div className="seat__tag seat__tag--bet">Bet {formatChips(seat.betThisRound)}</div>
      ) : null}
    </div>
  );
}
