import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Wheel.css';

const TIER_ORDER = ['bronze', 'silver', 'gold'];
const TIER_META = {
  bronze: {
    label: 'Bronze',
    wedgeA: '#3a2410',
    wedgeB: '#7a4a20',
    text: '#f5c896',
    border: 'rgba(205, 127, 50, 0.4)',
    rim: 'linear-gradient(135deg, #c98a4b, #5c3c1c 55%, #c98a4b)',
    hub: 'radial-gradient(circle at 35% 30%, #e3a76f, #6b4322 75%)',
    glow: 'rgba(205, 127, 50, 0.45)',
  },
  silver: {
    label: 'Silver',
    wedgeA: '#20232a',
    wedgeB: '#575e6b',
    text: '#eef1f5',
    border: 'rgba(192, 197, 206, 0.4)',
    rim: 'linear-gradient(135deg, #e4e9ef, #6b7280 55%, #e4e9ef)',
    hub: 'radial-gradient(circle at 35% 30%, #eef1f5, #7c828c 75%)',
    glow: 'rgba(200, 208, 220, 0.4)',
  },
  gold: {
    label: 'Gold',
    wedgeA: '#372a08',
    wedgeB: '#8a6a1c',
    text: '#fbe9b8',
    border: 'rgba(201, 169, 97, 0.5)',
    rim: 'linear-gradient(135deg, #f3e4b8, #9c7c3b 55%, #f3e4b8)',
    hub: 'radial-gradient(circle at 35% 30%, #f3e4b8, #9c7c3b 75%)',
    glow: 'rgba(243, 228, 184, 0.5)',
  },
};
const SPIN_MS = 3400;
const BULB_COUNT = 12;

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
  const [costPops, setCostPops] = useState({});

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

    // Take the entry cost off the displayed balance the instant you click —
    // don't wait for the spin animation to finish to show it left your
    // pocket. The prize (if any) lands on top of this once the wheel stops.
    const balanceBeforeSpin = user.chips;
    onUserUpdate({ ...user, chips: balanceBeforeSpin - config.cost });

    const popId = `${Date.now()}-${Math.random()}`;
    setCostPops((prev) => ({ ...prev, [key]: { id: popId, value: config.cost } }));
    setTimeout(() => {
      setCostPops((prev) => (prev[key]?.id === popId ? { ...prev, [key]: null } : prev));
    }, 900);

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
        // Roll back the optimistic deduction — the spin never happened.
        onUserUpdate({ ...user, chips: balanceBeforeSpin });
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
                  <div className="wheel-dial-pointer" style={{ filter: `drop-shadow(0 0 6px ${meta.glow})` }} />

                  <div className="wheel-dial-bezel" style={{ background: meta.rim }}>
                    <div className="wheel-dial-bulbs">
                      {Array.from({ length: BULB_COUNT }).map((_, i) => (
                        <span
                          key={i}
                          className="wheel-dial-bulb"
                          style={{ transform: `rotate(${(i * 360) / BULB_COUNT}deg) translateY(-6.5rem)` }}
                        />
                      ))}
                    </div>

                    <div
                      className="wheel-dial"
                      style={{
                        background: wheelGradient(config.segments.length, meta),
                        transform: `rotate(${rotations[key]}deg)`,
                        boxShadow: `0 0 28px ${meta.glow}`,
                      }}
                    >
                      <div
                        className="wheel-dial__spokes"
                        style={{ '--segs': config.segments.length }}
                      />
                      <div className="wheel-dial__sheen" />
                      {config.segments.map((val, i) => (
                        <span
                          key={i}
                          className="wheel-dial__label"
                          style={{
                            color: meta.text,
                            transform: `rotate(${i * segAngle + segAngle / 2}deg) translateY(-5.9rem)`,
                          }}
                        >
                          {val}
                        </span>
                      ))}
                    </div>

                    <div className="wheel-dial-hub" style={{ background: meta.hub }} />
                  </div>

                  {costPops[key] && (
                    <div key={costPops[key].id} className="wheel-cost-pop">
                      -{costPops[key].value}
                    </div>
                  )}
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
