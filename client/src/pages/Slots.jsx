import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti.jsx';
import WinCelebration from '../components/WinCelebration.jsx';
import { api } from '../api.js';
import { formatChips, parseChipsInput } from '../chips.js';
import { playFanfare } from '../audio.js';
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
    };
  }
  return {
    strip: [randomKey(keys), result, ...filler],
    start: -FILLER_COUNT * SYMBOL_H,
    end: 0,
  };
}

export default function Slots({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [paytable, setPaytable] = useState(null);
  const [bet, setBet] = useState(25);
  // What's actually shown in the bet field — kept separate from `bet` so
  // typing "10k" can sit on screen as-is while `bet` (the real number
  // used everywhere else) updates the moment it parses.
  const [betText, setBetText] = useState('25');
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(null);
  const [result, setResult] = useState(null);
  const [shake, setShake] = useState(false);
  // Which reels have finished spinning and lit up — turned off the moment
  // a new spin starts, lit one at a time as each reel's own stop timer
  // fires, in the same 1st/2nd/3rd order they actually stop in.
  const [litReels, setLitReels] = useState([false, false, false]);
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
    setLitReels([false, false, false]);
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
      // Each reel gets its own stop light, lit the instant that reel's
      // animation actually ends — same 1st/2nd/3rd cascade as the stops
      // themselves, not all three at once.
      DURATIONS.forEach((duration, i) => {
        setTimeout(() => {
          if (spinIdRef.current !== id) return;
          setLitReels((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, duration * 1000);
      });
      setTimeout(() => {
        if (spinIdRef.current !== id) return;
        setSpinning(false);
        setResult(res);
        setDisplayChips(res.chips);
        onUserUpdate({ ...user, chips: res.chips, rank: res.rank });
        // Only ever fires on a real win — no fake near-misses, just make an
        // actual win feel like a bigger deal: a fanfare plus a quick screen
        // shake on the cabinet, scaled up a notch for the rare jackpot.
        if (res.payout > 0) {
          playFanfare();
          if (res.win === 'jackpot') playFanfare();
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
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
        <div className={`slot-cabinet ${shake ? 'slot-cabinet--shake' : ''}`}>
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
              <div className={`slot-reel ${litReels[i] ? 'slot-reel--lit' : ''}`} key={i}>
                <div className="slot-reel__light" aria-hidden="true" />
                {reel ? (
                  <div
                    key={reel.id}
                    className="slot-reel__strip"
                    style={{
                      '--reel-start': `${reel.start}px`,
                      '--reel-end': `${reel.end}px`,
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
                onClick={() => {
                  setBet(v);
                  setBetText(String(v));
                }}
              >
                {formatChips(v)}
              </button>
            ))}
            <button
              className="slot-bet-btn"
              disabled={spinning || user.chips <= 0}
              onClick={() => {
                setBet(user.chips);
                setBetText(String(user.chips));
              }}
            >
              Max
            </button>
          </div>

          <div className="slot-bet-custom">
            <span className="slot-bet-custom__label">Bet</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 10k"
              className="slot-bet-input"
              value={betText}
              disabled={spinning}
              onChange={(e) => {
                const text = e.target.value;
                setBetText(text);
                const parsed = parseChipsInput(text);
                if (parsed !== null) setBet(Math.max(0, parsed));
              }}
              onBlur={() => {
                // Leaving the field with something unparseable ("10kk",
                // empty, etc.) snaps the text back to match the last good
                // bet, so the field never gets stuck showing a value that
                // doesn't match what Spin would actually wager.
                if (parseChipsInput(betText) === null) setBetText(String(bet));
              }}
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
