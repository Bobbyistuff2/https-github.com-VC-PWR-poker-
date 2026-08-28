import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatChips } from '../chips.js';
import './Codes.css';

export default function Codes({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!user) {
    navigate('/');
    return null;
  }

  async function handleRedeem(e) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await api.redeemCode(code);
      onUserUpdate({ ...user, chips: res.chips, rank: res.rank });
      setResult({ money: res.moneyGained, xp: res.xpGained });
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="codes-page">
      <header className="codes-header">
        <button className="codes-header__back" onClick={() => navigate('/lobby')}>
          <span className="codes-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="codes-header__title">Redeem Code</h1>
        <div className="codes-header__chips">{formatChips(user.chips)}</div>
      </header>

      <main className="codes-main">
        <form className="codes-panel" onSubmit={handleRedeem}>
          <h2 className="codes-panel__title">Have a code?</h2>
          <p className="codes-panel__sub">Enter it below to claim your reward.</p>

          <input
            className="codes-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            maxLength={24}
            autoFocus
          />

          {error && <p className="codes-message codes-message--error">{error}</p>}
          {result && (
            <p className="codes-message codes-message--success">
              Redeemed! +{formatChips(result.money)}
              {result.xp > 0 && ` and +${result.xp.toLocaleString()} XP`}
            </p>
          )}

          <button className="codes-submit" type="submit" disabled={busy || !code.trim()}>
            {busy ? 'Redeeming…' : 'Redeem'}
          </button>
        </form>
      </main>
    </div>
  );
}
