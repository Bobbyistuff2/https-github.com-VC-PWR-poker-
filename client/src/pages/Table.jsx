import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Seat from '../components/Seat.jsx';
import PlayingCard from '../components/PlayingCard.jsx';
import Chip from '../components/Chip.jsx';
import HandRankings from '../components/HandRankings.jsx';
import HandHistory from '../components/HandHistory.jsx';
import Confetti from '../components/Confetti.jsx';
import ChipRain from '../components/ChipRain.jsx';
import PlayerStatsModal from '../components/PlayerStatsModal.jsx';
import { getSocket } from '../socket.js';
import { api } from '../api.js';
import { DENOMINATIONS, formatChips, decomposeChips } from '../chips.js';
import './Table.css';

const SEAT_COUNT = 4;
const MAX_BOTS = 3;
const WIN_EXCLAMATIONS = [
  'Well Played',
  'Hand Won',
  'Victory',
  'The Pot Is Claimed',
  'A Fine Hand',
  'Well Earned',
];

export default function Table({ user, onUserUpdate }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [actionError, setActionError] = useState('');
  const [raiseExtra, setRaiseExtra] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [exclamation, setExclamation] = useState('');
  const [chipPop, setChipPop] = useState(null);
  const [actionToasts, setActionToasts] = useState([]);
  const [achievementToasts, setAchievementToasts] = useState([]);
  const [statsUserId, setStatsUserId] = useState(null);
  const [flyingChips, setFlyingChips] = useState([]);
  const lastSeenResultRef = useRef(null);
  const lastSeenActionRef = useRef(null);
  const tableSurfaceRef = useRef(null);
  const flightIdRef = useRef(0);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    let receivedFirstState = false;
    function handleState(state) {
      if (!receivedFirstState) {
        receivedFirstState = true;
        // Don't replay the "X wins" overlay or an action toast for
        // something that happened before we joined/reconnected — only for
        // ones that happen live.
        lastSeenResultRef.current = state.lastResult;
        lastSeenActionRef.current = state.lastAction;
      }
      setRoom(state);
    }
    function handleAchievements(list) {
      for (const achievement of list) {
        const toast = { id: `${Date.now()}-${Math.random()}`, achievement };
        setAchievementToasts((prev) => [...prev, toast]);
        setTimeout(() => {
          setAchievementToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, 4500);
      }
    }

    socket.on('room:state', handleState);
    socket.on('achievement:unlocked', handleAchievements);
    socket.emit('room:join', { code }, (res) => {
      if (res?.error) setJoinError(res.error);
    });

    return () => {
      socket.off('room:state', handleState);
      socket.off('achievement:unlocked', handleAchievements);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    setRaiseExtra(0);
  }, [room?.turnSeat, room?.stage]);

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  useEffect(() => {
    if (!room?.lastAction) return;
    // Compare by seq, not object identity — every broadcast round-trips
    // through JSON, so a rebroadcast of the *same* last action (e.g. right
    // after a new hand starts, before anyone's acted yet) would otherwise
    // look "new" and re-toast a stale "Folded" from the previous hand.
    if (room.lastAction.seq === lastSeenActionRef.current?.seq) return;
    lastSeenActionRef.current = room.lastAction;

    const toast = {
      id: `${Date.now()}-${Math.random()}`,
      seatIndex: room.lastAction.seatIndex,
      label: room.lastAction.label,
    };
    setActionToasts((prev) => [...prev, toast]);
    // Each toast times its own removal independently, so a fast run of
    // actions (e.g. bot turns) doesn't cut an earlier toast short. Keep in
    // sync with the seat-action-float animation duration in Seat.css.
    setTimeout(() => {
      setActionToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3200);

    // Chips actually moved into the pot this action (0 for a fold/check) —
    // animate them flying from the seat to the table center. Skipped under
    // reduced-motion, same as the other decorative animations.
    const contributed = room.lastAction.contributed || 0;
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (contributed > 0 && !reduceMotion && tableSurfaceRef.current) {
      const seatEl = tableSurfaceRef.current.querySelector(
        `[data-seat-index="${room.lastAction.seatIndex}"]`
      );
      const potEl = tableSurfaceRef.current.querySelector('.table-center');
      if (seatEl && potEl) {
        const from = seatEl.getBoundingClientRect();
        const to = potEl.getBoundingClientRect();
        const fromX = from.left + from.width / 2;
        const fromY = from.top + from.height / 2;
        const toX = to.left + to.width / 2;
        const toY = to.top + to.height / 2;
        // One flying chip per denomination present in the bet (capped so a
        // huge all-in doesn't spawn a wall of chips), each colored to match
        // the pot display's own chip breakdown and lightly staggered.
        const pieces = decomposeChips(contributed).slice(0, 4);
        const newChips = pieces.map((d, i) => ({
          id: `${flightIdRef.current++}`,
          color: d.color,
          x: fromX,
          y: fromY,
          dx: toX - fromX,
          dy: toY - fromY,
          delay: i * 0.06,
        }));
        setFlyingChips((prev) => [...prev, ...newChips]);
        const ids = new Set(newChips.map((c) => c.id));
        setTimeout(() => {
          setFlyingChips((prev) => prev.filter((c) => !ids.has(c.id)));
        }, 700);
      }
    }
  }, [room?.lastAction]);

  useEffect(() => {
    if (room?.stage !== 'waiting' || !room.lastResult) return;
    if (room.lastResult === lastSeenResultRef.current) return;
    lastSeenResultRef.current = room.lastResult;

    setShowResult(true);
    setExclamation(WIN_EXCLAMATIONS[Math.floor(Math.random() * WIN_EXCLAMATIONS.length)]);
    const canStart = room.canStart;
    const t = setTimeout(() => {
      setShowResult(false);
      if (canStart) {
        getSocket().emit('room:start', {}, () => {});
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [room?.stage, room?.lastResult, room?.canStart]);

  const mySeatIndex = useMemo(() => {
    if (!room || !user) return null;
    const seat = room.seats.find((s) => s && s.userId === user.id);
    return seat ? seat.seatIndex : null;
  }, [room, user]);

  if (!user) return null;

  if (joinError) {
    return (
      <div className="table-page table-page--center">
        <p>{joinError}</p>
        <button className="primary-btn" onClick={() => navigate('/lobby')}>
          Back to Lobby
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="table-page table-page--center">
        <p>Connecting to table…</p>
      </div>
    );
  }

  const mySeat = mySeatIndex != null ? room.seats[mySeatIndex] : null;
  const isMyTurn = mySeatIndex != null && room.turnSeat === mySeatIndex;
  const toCall = mySeat ? Math.max(0, room.currentBet - mySeat.betThisRound) : 0;
  const raiseToAmount = mySeat ? mySeat.betThisRound + toCall + raiseExtra : 0;
  const maxAvailable = mySeat ? mySeat.chips : 0;
  const committedBeyondCall = toCall + raiseExtra;
  const turnPlayer = room.seats.find((s) => s && s.seatIndex === room.turnSeat);
  const botCount = room.seats.filter((s) => s && s.isBot).length;
  const hasEmptySeat = room.seats.some((s) => s === null);
  const canAddBot = botCount < MAX_BOTS && hasEmptySeat;
  // Everyone else folded — there was no showdown, so `hand` is always null
  // for this payout (see Room.js's singleWinnerOnly branch). Worth saying
  // plainly rather than showing it identically to a real showdown win,
  // which reads as if the winning hand actually got compared and beat
  // someone.
  const foldWinner =
    room.lastResult?.payouts.length === 1 && room.lastResult.payouts[0].hand === null
      ? room.lastResult.payouts[0]
      : null;

  function positionOf(seatIndex) {
    const base = mySeatIndex != null ? mySeatIndex : 0;
    return (seatIndex - base + SEAT_COUNT) % SEAT_COUNT;
  }

  function emitAction(action, amount) {
    getSocket().emit('room:action', { action, amount }, (res) => {
      setActionError(res?.error || '');
    });
    setRaiseExtra(0);
  }

  function handleStart() {
    getSocket().emit('room:start', {}, (res) => {
      setActionError(res?.error || '');
    });
  }

  function handleAddBot() {
    getSocket().emit('room:addBot', {}, (res) => {
      setActionError(res?.error || '');
    });
  }

  function handleRemoveBot() {
    getSocket().emit('room:removeBot', {}, (res) => {
      setActionError(res?.error || '');
    });
  }

  function handleLeave() {
    getSocket().emit('room:leave', {}, async (res) => {
      if (res?.error) return setActionError(res.error);
      const { user: updated } = await api.me();
      onUserUpdate(updated);
      navigate('/lobby');
    });
  }

  function addChip(value) {
    setRaiseExtra((prev) => Math.max(0, Math.min(prev + value, maxAvailable - toCall)));
    setChipPop({ value, id: Date.now() });
  }

  return (
    <div className="table-page">
      {achievementToasts.length > 0 && (
        <div className="achievement-toasts">
          {achievementToasts.map((t) => (
            <div key={t.id} className="achievement-toast">
              <span className="achievement-toast__icon">🏆</span>
              <div className="achievement-toast__text">
                <div className="achievement-toast__title">{t.achievement.title}</div>
                <div className="achievement-toast__desc">{t.achievement.description}</div>
              </div>
              <div className="achievement-toast__reward">+{t.achievement.reward}</div>
            </div>
          ))}
        </div>
      )}

      <header className="table-header">
        <button className="table-header__back" onClick={() => navigate('/lobby')}>
          <span className="table-header__back__arrow">←</span> Lobby
        </button>
        <div className="table-header__title">
          <span className="table-header__code">Table {room.code}</span>
          {room.type === 'tournament' && <span className="table-header__badge">Tournament</span>}
          {room.type === 'quick' && <span className="table-header__badge">Quick Game</span>}
        </div>
        {room.stage === 'waiting' && mySeat && (
          <button className="table-header__leave" onClick={handleLeave}>
            Leave Table
          </button>
        )}
      </header>

      <HandRankings />
      <HandHistory history={room.handHistory} mySeatIndex={mySeatIndex} />

      {actionError && <div className="table-inline-error">{actionError}</div>}

      <div
        className="table-surface"
        ref={tableSurfaceRef}
        data-tier={user.rank?.tier}
        data-bg={user.equippedBackground !== 'bg-classic' ? user.equippedBackground : undefined}
      >
        <div className="table-surface__pattern" aria-hidden="true" />
        {room.seats.map(
          (seat, i) =>
            seat && (
              <Seat
                key={i}
                seat={seat}
                position={positionOf(i)}
                isDealer={i === room.dealerSeat}
                isTurn={i === room.turnSeat}
                isMe={seat.userId === user.id}
                actionToast={[...actionToasts].reverse().find((t) => t.seatIndex === i)}
                onViewStats={setStatsUserId}
                cardSkin={user.equippedCardSkin}
              />
            )
        )}

        <div className="table-center">
          <div className="community-cards">
            <div className="community-cards__row community-cards__row--top">
              {Array.from({ length: 3 }).map((_, i) =>
                room.communityCards[i] ? (
                  <PlayingCard key={i} card={room.communityCards[i]} size="md" skin={user.equippedCardSkin} />
                ) : (
                  <div key={`ph${i}`} className="card-placeholder card-placeholder--md" />
                )
              )}
            </div>
            <div className="community-cards__row community-cards__row--bottom">
              {Array.from({ length: 2 }).map((_, j) => {
                const i = j + 3;
                return room.communityCards[i] ? (
                  <PlayingCard key={i} card={room.communityCards[i]} size="md" skin={user.equippedCardSkin} />
                ) : (
                  <div key={`ph${i}`} className="card-placeholder card-placeholder--md" />
                );
              })}
            </div>
          </div>
          {room.pot > 0 && (
            <div className="pot-display">
              <div className="pot-display__chips">
                {decomposeChips(room.pot)
                  .slice(0, 5)
                  .map((d) => (
                    <div key={d.value} className="pot-display__chip">
                      <Chip value="" color={d.color} text={d.text} size="sm" />
                    </div>
                  ))}
              </div>
              <span className="pot-display__total">Pot {formatChips(room.pot)}</span>
            </div>
          )}
        </div>
      </div>

      {flyingChips.length > 0 && (
        <div className="chip-flight-layer" aria-hidden="true">
          {flyingChips.map((c) => (
            <div
              key={c.id}
              className="chip-flight"
              style={{
                left: `${c.x}px`,
                top: `${c.y}px`,
                background: c.color,
                animationDelay: `${c.delay}s`,
                '--dx': `${c.dx}px`,
                '--dy': `${c.dy}px`,
              }}
            />
          ))}
        </div>
      )}

      {showResult && room.lastResult && (
        <div className="round-result-overlay">
          {!(foldWinner && foldWinner.profit === 0) && (
            <>
              <Confetti />
              <ChipRain />
            </>
          )}
          <div className="round-result-overlay__text">
            {foldWinner ? (
              <>
                <div className="round-result-overlay__exclaim">Everyone folded</div>
                {foldWinner.profit > 0 && (
                  <div className="round-result-overlay__line">
                    {room.seats.find((s) => s && s.seatIndex === foldWinner.seatIndex)?.name || 'Player'} wins{' '}
                    {formatChips(foldWinner.profit)}
                  </div>
                )}
              </>
            ) : room.lastResult.payouts.length > 0 ? (
              <>
                <div className="round-result-overlay__exclaim">{exclamation}</div>
                {room.lastResult.payouts.map((p, i) => {
                  const seat = room.seats.find((s) => s && s.seatIndex === p.seatIndex);
                  return (
                    <div key={i} className="round-result-overlay__line">
                      {seat?.name || 'Player'} wins {formatChips(p.profit)}
                      {p.hand ? ` with ${p.hand}` : ''}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="round-result-overlay__line">Round over</div>
            )}
          </div>
        </div>
      )}

      <div className="your-panel">
        {mySeat && mySeat.holeCards.length > 0 && (
          <div className="your-cards">
            {mySeat.holeCards.map((c, i) => (
              <PlayingCard key={i} card={c} size="lg" skin={user.equippedCardSkin} />
            ))}
          </div>
        )}

        {room.stage === 'waiting' ? (
          <div className="your-panel__waiting">
            {mySeat ? (
              <>
                <button className="primary-btn" disabled={!room.canStart} onClick={handleStart}>
                  {room.canStart ? 'Start Hand' : 'Waiting for more players…'}
                </button>
                <div className="bot-controls">
                  {canAddBot && (
                    <button className="bot-btn" onClick={handleAddBot}>
                      🤖 Add Bot ({botCount}/{MAX_BOTS})
                    </button>
                  )}
                  {botCount > 0 && (
                    <button className="bot-btn" onClick={handleRemoveBot}>
                      Remove Bot
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p>Spectating — table is full or a hand is in progress.</p>
            )}
          </div>
        ) : isMyTurn ? (
          <div className="action-bar">
            <div className="action-bar__panel">
              <div className="action-bar__info">
                <span className="action-bar__name">
                  {room.dealerSeat === mySeatIndex && <span className="action-bar__dealer">D</span>}
                  {mySeat?.name}
                </span>
                <span className="action-bar__chips">{formatChips(mySeat?.chips ?? 0)}</span>
              </div>

              <div className="action-bar__buttons">
                <button className="action-btn action-btn--fold" onClick={() => emitAction('fold')}>
                  Fold <span className="action-btn__arrow">↘</span>
                </button>
                <button
                  className="action-btn action-btn--call"
                  onClick={() =>
                    raiseExtra > 0 ? emitAction('raise', raiseToAmount) : emitAction('call')
                  }
                >
                  {raiseExtra > 0
                    ? `Raise to ${formatChips(raiseToAmount)}`
                    : toCall > 0
                      ? `Call ${formatChips(toCall)}`
                      : 'Check'}
                  <span className="action-btn__arrow">→</span>
                </button>
                <button className="action-btn action-btn--allin" onClick={() => emitAction('allin')}>
                  <span className="action-btn__arrow">↗</span> All In
                </button>
              </div>
            </div>

            <div className="chip-tray">
              {chipPop && (
                <div key={chipPop.id} className="chip-pop">
                  +{formatChips(chipPop.value)}
                </div>
              )}
              {DENOMINATIONS.map((d) => (
                <Chip
                  key={d.value}
                  value={d.value}
                  color={d.color}
                  text={d.text}
                  size="md"
                  onClick={() => addChip(d.value)}
                  disabled={committedBeyondCall + d.value > maxAvailable}
                />
              ))}
              {raiseExtra > 0 && (
                <button className="chip-tray__clear" onClick={() => setRaiseExtra(0)}>
                  Clear (+{formatChips(raiseExtra)})
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="your-panel__waiting-turn">
            {mySeat?.folded ? 'You folded — waiting for the hand to finish.' : `Waiting for ${turnPlayer?.name || '…'}…`}
          </p>
        )}
      </div>

      <PlayerStatsModal userId={statsUserId} onClose={() => setStatsUserId(null)} />
    </div>
  );
}
