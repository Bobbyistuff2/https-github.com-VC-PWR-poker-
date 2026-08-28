import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayingCard from '../components/PlayingCard.jsx';
import { api } from '../api.js';
import { formatChips } from '../chips.js';
import './HiLo.css';

const WAGER_PRESETS = [10, 25, 50, 100, 250];

export default function HiLo({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [wager, setWager] = useState(25);
  const [round, setRound] = useState(null);
  const [busted, setBusted] = useState(null);
  const [cashedOut, setCashedOut] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    api
      .getHiLoState()
      .then(({ round }) => setRound(round))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  async function handleStart() {
    if (busy || wager > user.chips) return;
    setBusy(true);
    setError('');
    setBusted(null);
    setCashedOut(null);
    try {
      const res = await api.startHiLo(wager);
      onUserUpdate({ ...user, chips: res.chips });
      setRound({
        card: res.card,
        wager: res.wager,
        cumulativeMultiplier: res.cumulativeMultiplier,
        potentialPayout: res.potentialPayout,
        higherMultiplier: res.higherMultiplier,
        lowerMultiplier: res.lowerMultiplier,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGuess(direction) {
    if (busy || !round) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.guessHiLo(direction);
      if (!res.correct) {
        setBusted({ card: res.card, wager: res.wager });
        setRound(null);
        return;
      }
      setRound({
        card: res.card,
        wager: round.wager,
        cumulativeMultiplier: res.cumulativeMultiplier,
        potentialPayout: res.potentialPayout,
        higherMultiplier: res.higherMultiplier,
        lowerMultiplier: res.lowerMultiplier,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCashOut() {
    if (busy || !round) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.cashOutHiLo();
      onUserUpdate({ ...user, chips: res.chips, rank: res.rank });
      setCashedOut({ payout: res.payout });
      setRound(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hilo-page">
      <header className="hilo-header">
        <button className="hilo-header__back" onClick={() => navigate('/lobby')}>
          <span className="hilo-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="hilo-header__title">Higher / Lower</h1>
        <div className="hilo-header__chips">
          <span className="hilo-header__chip-dot" />
          {user.chips.toLocaleString()}
        </div>
      </header>

      {error && <div className="hilo-error">{error}</div>}

      {loading ? (
        <p className="hilo-loading">Loading…</p>
      ) : (
        <main className="hilo-main">
          {!round ? (
            <div className="hilo-panel">
              {busted && (
                <div className="hilo-result hilo-result--lose">
                  <div className="hilo-result__card">
                    <PlayingCard card={busted.card} size="lg" />
                  </div>
                  <p className="hilo-result__text">Busted — lost {formatChips(busted.wager)} chips.</p>
                </div>
              )}
              {cashedOut && (
                <div className="hilo-result hilo-result--win">
                  <p className="hilo-result__text">Cashed out +{formatChips(cashedOut.payout)} chips!</p>
                </div>
              )}

              <h2 className="hilo-panel__title">Place your wager</h2>
              <p className="hilo-panel__sub">Guess higher or lower than the showing card. Cash out anytime.</p>

              <div className="hilo-wager-grid">
                {WAGER_PRESETS.map((v) => (
                  <button
                    key={v}
                    className={`hilo-wager-btn ${wager === v ? 'hilo-wager-btn--active' : ''}`}
                    disabled={v > user.chips}
                    onClick={() => setWager(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <button className="hilo-deal-btn" disabled={busy || wager > user.chips} onClick={handleStart}>
                {busy ? 'Dealing…' : `Deal In (${wager})`}
              </button>
            </div>
          ) : (
            <div className="hilo-panel">
              <div className="hilo-stats">
                <div className="hilo-stat">
                  <span className="hilo-stat__label">Multiplier</span>
                  <span className="hilo-stat__value">{round.cumulativeMultiplier.toFixed(2)}x</span>
                </div>
                <div className="hilo-stat">
                  <span className="hilo-stat__label">Potential Payout</span>
                  <span className="hilo-stat__value hilo-stat__value--accent">
                    {formatChips(round.potentialPayout)}
                  </span>
                </div>
              </div>

              <div className="hilo-card-slot">
                <PlayingCard card={round.card} size="lg" />
              </div>

              <div className="hilo-guess-row">
                <button
                  className="hilo-guess-btn hilo-guess-btn--lower"
                  disabled={busy || round.lowerMultiplier == null}
                  onClick={() => handleGuess('lower')}
                >
                  <span>▼ Lower</span>
                  {round.lowerMultiplier != null && <span className="hilo-guess-btn__mult">{round.lowerMultiplier}x</span>}
                </button>
                <button
                  className="hilo-guess-btn hilo-guess-btn--higher"
                  disabled={busy || round.higherMultiplier == null}
                  onClick={() => handleGuess('higher')}
                >
                  <span>▲ Higher</span>
                  {round.higherMultiplier != null && <span className="hilo-guess-btn__mult">{round.higherMultiplier}x</span>}
                </button>
              </div>

              <button
                className="hilo-cashout-btn"
                disabled={busy || round.cumulativeMultiplier <= 1}
                onClick={handleCashOut}
              >
                Cash Out ({formatChips(round.potentialPayout)})
              </button>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
