import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Wheel.css';

const TIER_ORDER = ['bronze', 'silver', 'gold'];
const TIER_META = {
  bronze: { label: 'Bronze', wedgeA: '#2b1c0f', wedgeB: '#5c3c1c', text: '#e3a76f', border: 'rgba(205, 127, 50, 0.4)' },
  silver: { label: 'Silver', wedgeA: '#1c1e22', wedgeB: '#4a4f58', text: '#d7dbe2', border: 'rgba(192, 197, 206, 0.4)' },
  gold: { label: 'Gold', wedgeA: '#2a220a', wedgeB: '#6b551a', text: '#f3e4b8', border: 'rgba(201, 169, 97, 0.5)' },
};
const SPIN_MS = 3200;

function wheelGradient(segCount, meta) {
  const segAngle = 360 / segCount;
  const stops = [];
  for (let i = 0; i < segCount; i += 1) {
    const color = i % 2 === 0 ? meta.wedgeA : meta.wedgeB;
    stops.push(`${color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`);
  }
  return `conic-gradient(${stops.join(', ')})`;
}

export default function Wheel({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState(null);
  const [error, setError] = useState('');
  const [spinning, setSpinning] = useState(null);
  const [rotations, setRotations] = useState({ bronze: 0, silver: 0, gold: 0 });
  const [results, setResults] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    api
      .getWheelTiers()
      .then(({ tiers }) => setTiers(tiers))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  function handleSpin(key) {
    if (spinning || !tiers) return;
    const config = tiers[key];
    if (user.chips < config.cost) {
      setError(`You need ${config.cost} chips to spin the ${TIER_META[key].label} wheel.`);
      return;
    }
    setError('');
    setSpinning(key);
    setResults((prev) => ({ ...prev, [key]: null }));

    api
      .spinWheel(key)
      .then((res) => {
        const segAngle = 360 / config.segments.length;
        const targetMid = res.index * segAngle + segAngle / 2;
        setRotations((prev) => ({
          ...prev,
          [key]: prev[key] - (prev[key] % 360) + 6 * 360 + (360 - targetMid),
        }));
        setTimeout(() => {
          setResults((prev) => ({ ...prev, [key]: res.prize }));
          setSpinning(null);
          onUserUpdate({ ...user, chips: res.chips });
        }, SPIN_MS);
      })
      .catch((err) => {
        setError(err.message);
        setSpinning(null);
      });
  }

  return (
    <div className="wheel-page">
      <header className="wheel-header">
        <button className="wheel-header__back" onClick={() => navigate('/lobby')}>
          <span className="wheel-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="wheel-header__title">Spin the Wheel</h1>
        <div className="wheel-header__chips">
          <span className="wheel-header__chip-dot" />
          {user.chips.toLocaleString()}
        </div>
      </header>

      {error && <div className="wheel-error">{error}</div>}

      {!tiers ? (
        <p className="wheel-loading">Loading wheels…</p>
      ) : (
        <div className="wheel-grid">
          {TIER_ORDER.map((key) => {
            const config = tiers[key];
            const meta = TIER_META[key];
            const segAngle = 360 / config.segments.length;
            return (
              <div key={key} className="wheel-card" style={{ '--tier-border': meta.border }}>
                <h2 className="wheel-card__title" style={{ color: meta.text }}>
                  {meta.label}
                </h2>
                <p className="wheel-card__sub">
                  Play for {config.cost} · Win up to {config.max}
                </p>

                <div className="wheel-dial-wrap">
                  <div className="wheel-dial-pointer" />
                  <div
                    className="wheel-dial"
                    style={{
                      background: wheelGradient(config.segments.length, meta),
                      transform: `rotate(${rotations[key]}deg)`,
                    }}
                  >
                    {config.segments.map((val, i) => (
                      <span
                        key={i}
                        className="wheel-dial__label"
                        style={{
                          color: meta.text,
                          transform: `rotate(${i * segAngle + segAngle / 2}deg) translateY(-5.4rem)`,
                        }}
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="wheel-card__result-slot">
                  {results[key] != null && <div className="wheel-card__result">+{results[key]} chips!</div>}
                </div>

                <button
                  className="wheel-card__spin"
                  disabled={!!spinning || user.chips < config.cost}
                  onClick={() => handleSpin(key)}
                >
                  {spinning === key ? 'Spinning…' : `Spin (${config.cost})`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
