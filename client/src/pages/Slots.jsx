import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti.jsx';
import WinCelebration from '../components/WinCelebration.jsx';
import { api } from '../api.js';
import { formatChips } from '../chips.js';
import './Slots.css';

const BET_PRESETS = [10, 25, 100, 500, 1000];

// How many filler symbols each reel scrolls through before landing — tuned
// together with the CSS animation durations in Slots.css for a satisfying
// spin length, not the actual odds (those are server-only, see slots.js).
const FILLER_COUNT = 18;
const SYMBOL_H = 84; // px — must match .slot-cell height in Slots.css
// Reel 1 and 3 spin the same way (symbols travel upward through the
// window), reel 2 spins the opposite way (downward) — the classic
// alternating-reel look, per how this was asked for.
const DIRECTIONS = ['up', 'down', 'up'];
// Reels stop one after another rather than all at once — the familiar
// cascading "click… click… click" of a real slot machine.
const DURATIONS = [1.3, 1.7, 2.1];
const SETTLE_MS = 2100;

function randomKey(keys) {
  return keys[Math.floor(Math.random() * keys.length)];
}

// Builds one reel's visual strip of symbol keys, plus the translateY
// distance to animate across, ending with `result` centered in the
// 3-row window. 'down' reels are built back-to-front rather than just
// running the 'up' animation in reverse, so the strip content itself
// visibly flows the opposite direction.
function buildReel(result, direction, keys) {
  const filler = Array.from({ length: FILLER_COUNT }, () => randomKey(keys));
  if (direction === 'up') {
    return {
      strip: [...filler, result, randomKey(keys)],
      start: 0,
      end: -(FILLER_COUNT - 1) * SYMBOL_H,
      bounce: -10,
    };
  }
  return {
    strip: [randomKey(keys), result, ...filler],
    start: -FILLER_COUNT * SYMBOL_H,
    end: 0,
    bounce: 10,
  };
}

export default function Slots({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [paytable, setPaytable] = useState(null);
  const [bet, setBet] = useState(25);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(null);
  const [result, setResult] = useState(null);
  const [displayChips, setDisplayChips] = useState(user?.chips ?? 0);
  const [error, setError] = useState('');
  const spinIdRef = useRef(0);
  const emojiByKey = useMemo(() => {
    const map = {};
    for (const s of paytable?.symbols || []) map[s.key] = s.emoji;
    return map;
  }, [paytable]);
  const symbolKeys = useMemo(() => (paytable?.symbols || []).map((s) => s.key), [paytable]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    api
      .getSlotsPaytable()
      .then(setPaytable)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDisplayChips(user?.chips ?? 0);
  }, [user?.chips]);

  if (!user) return null;

  async function handleSpin() {
    if (spinning || !symbolKeys.length) return;
    if (!Number.isInteger(bet) || bet <= 0) return setError('Enter a valid bet');
    if (bet > user.chips) return setError('Not enough chips for that bet');

    setError('');
    setResult(null);
    setSpinning(true);
    // The bet is "at risk" the moment the handle gets pulled — deduct it
    // immediately, same feel as a real machine's credit meter dropping
    // before the reels even stop.
    setDisplayChips(user.chips - bet);

    try {
      const res = await api.spinSlots(bet);
      const id = ++spinIdRef.current;
      setReels(
        res.reels.map((key, i) => ({ ...buildReel(key, DIRECTIONS[i], symbolKeys), id: `${id}-${i}` }))
      );
      setTimeout(() => {
        if (spinIdRef.current !== id) return;
        setSpinning(false);
        setResult(res);
        setDisplayChips(res.chips);
        onUserUpdate({ ...user, chips: res.chips, rank: res.rank });
      }, SETTLE_MS);
    } catch (err) {
      setSpinning(false);
      setDisplayChips(user.chips);
      setError(err.message);
    }
  }

  const won = result && result.payout > 0;

  return (
    <div className="slots-page">
      <header className="slots-header">
        <button className="slots-header__back" onClick={() => navigate('/lobby')}>
          <span className="slots-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="slots-header__title">777 Slots</h1>
        <div className="slots-header__chips">{formatChips(displayChips)}</div>
      </header>

      {error && <div className="slots-error">{error}</div>}

      <main className="slots-main">
        <div className="slot-cabinet">
          {won && (
            <div className="slot-cabinet__celebration" aria-hidden="true">
              <Confetti count={26} />
              {result.win !== 'pair' && <WinCelebration celebration={user.equippedCelebration} count={30} />}
            </div>
          )}

          <div className="slot-marquee">
            <span className="slot-marquee__bulb" />
            <span className="slot-marquee__text">777 JACKPOT</span>
            <span className="slot-marquee__bulb" />
          </div>

          <div className="slot-reels">
            <div className="slot-payline" aria-hidden="true" />
            {(reels || [null, null, null]).map((reel, i) => (
              <div className="slot-reel" key={i}>
                {reel ? (
                  <div
                    key={reel.id}
                    className="slot-reel__strip"
                    style={{
                      '--reel-start': `${reel.start}px`,
                      '--reel-end': `${reel.end}px`,
                      '--reel-bounce': `${reel.bounce}px`,
                      animationDuration: `${DURATIONS[i]}s`,
                    }}
                  >
                    {reel.strip.map((key, j) => (
                      <div className="slot-cell" key={j}>
                        {emojiByKey[key]}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="slot-reel__strip slot-reel__strip--idle">
                    <div className="slot-cell">{emojiByKey.seven || '7️⃣'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {result && !spinning && (
          <div className={`slot-result ${won ? 'slot-result--win' : 'slot-result--lose'}`}>
            {won ? (
              <>
                <div className="slot-result__title">
                  {result.win === 'jackpot' ? '🎉 JACKPOT! 🎉' : result.win === 'triple' ? 'Triple Match!' : 'Nice — pair of cherries!'}
                </div>
                <div className="slot-result__amount">+{formatChips(result.payout)}</div>
              </>
            ) : (
              <div className="slot-result__title slot-result__title--lose">No match — try again</div>
            )}
          </div>
        )}

        <div className="slot-controls">
          <div className="slot-bet-row">
            {BET_PRESETS.map((v) => (
              <button
                key={v}
                className={`slot-bet-btn ${bet === v ? 'slot-bet-btn--active' : ''}`}
                disabled={spinning || v > user.chips}
                onClick={() => setBet(v)}
              >
                {formatChips(v)}
              </button>
            ))}
            <button
              className="slot-bet-btn"
              disabled={spinning || user.chips <= 0}
              onClick={() => setBet(user.chips)}
            >
              Max
            </button>
          </div>

          <div className="slot-bet-custom">
            <span className="slot-bet-custom__label">Bet</span>
            <input
              type="number"
              className="slot-bet-input"
              min={1}
              max={user.chips}
              value={bet}
              disabled={spinning}
              onChange={(e) => setBet(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </div>

          <button
            className="slot-spin-btn"
            disabled={spinning || bet <= 0 || bet > user.chips}
            onClick={handleSpin}
          >
            {spinning ? 'Spinning…' : `Spin (${formatChips(bet)})`}
          </button>
        </div>

        {paytable && (
          <div className="slot-paytable">
            <h2 className="slot-paytable__title">Paytable</h2>
            <div className="slot-paytable__rows">
              {[...paytable.symbols].reverse().map((s) => (
                <div className="slot-paytable__row" key={s.key}>
                  <span className="slot-paytable__combo">
                    {s.emoji} {s.emoji} {s.emoji}
                  </span>
                  <span className="slot-paytable__mult">{s.tripleMultiplier}x bet</span>
                </div>
              ))}
              <div className="slot-paytable__row">
                <span className="slot-paytable__combo">
                  {emojiByKey.cherry} {emojiByKey.cherry} ❔
                </span>
                <span className="slot-paytable__mult">{paytable.twoCherryMultiplier}x bet</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
