import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayingCard from '../components/PlayingCard.jsx';
import { api } from '../api.js';
import { formatChips } from '../chips.js';
import './Shop.css';

export default function Shop({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    api
      .getShop()
      .then(setData)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  async function handleBuy(item) {
    setBusyId(item.id);
    setError('');
    try {
      const res = await api.buyItem(item.id);
      onUserUpdate({ ...user, chips: res.chips });
      setData((prev) => ({ ...prev, owned: [...prev.owned, item.id] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Mirrors server/shop.js's SLOT_COLUMNS — which field on the user object
  // (and in the /api/shop response) a given slot's equipped item lives in.
  const SLOT_FIELDS = {
    background: 'equippedBackground',
    cardSkin: 'equippedCardSkin',
    celebration: 'equippedCelebration',
  };

  async function handleEquip(item) {
    setBusyId(item.id);
    setError('');
    try {
      await api.equipItem(item.id);
      const field = SLOT_FIELDS[item.slot];
      onUserUpdate({ ...user, [field]: item.id });
      setData((prev) => ({ ...prev, [field]: item.id }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="shop-page">
      <header className="shop-header">
        <button className="shop-header__back" onClick={() => navigate('/lobby')}>
          <span className="shop-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="shop-header__title">Shop</h1>
        <div className="shop-header__chips">{formatChips(user.chips)}</div>
      </header>

      {error && <div className="shop-error">{error}</div>}

      {!data ? (
        <p className="shop-loading">Loading shop…</p>
      ) : (
        <main className="shop-main">
          <section className="shop-section">
            <h2 className="shop-section__title">Table Felt</h2>
            <p className="shop-section__sub">Changes the look of your poker table — only you see it.</p>
            <div className="shop-grid">
              {data.backgrounds.map((item) => (
                <ShopCard
                  key={item.id}
                  item={item}
                  owned={item.price === 0 || data.owned.includes(item.id)}
                  equipped={data.equippedBackground === item.id}
                  busy={busyId === item.id}
                  affordable={user.chips >= item.price}
                  onBuy={() => handleBuy(item)}
                  onEquip={() => handleEquip(item)}
                >
                  <div className={`shop-swatch shop-swatch--${item.id}`} />
                </ShopCard>
              ))}
            </div>
          </section>

          <section className="shop-section">
            <h2 className="shop-section__title">Card Skins</h2>
            <p className="shop-section__sub">Changes how your cards look — only for you.</p>
            <div className="shop-grid">
              {data.cardSkins.map((item) => (
                <ShopCard
                  key={item.id}
                  item={item}
                  owned={item.price === 0 || data.owned.includes(item.id)}
                  equipped={data.equippedCardSkin === item.id}
                  busy={busyId === item.id}
                  affordable={user.chips >= item.price}
                  onBuy={() => handleBuy(item)}
                  onEquip={() => handleEquip(item)}
                >
                  <div className="shop-card-preview">
                    <PlayingCard card={{ rank: 'A', suit: 'spades' }} size="sm" skin={item.id} />
                    <PlayingCard card={{ rank: 'K', suit: 'hearts' }} size="sm" skin={item.id} />
                  </div>
                </ShopCard>
              ))}
            </div>
          </section>

          <section className="shop-section">
            <h2 className="shop-section__title">Win Celebrations</h2>
            <p className="shop-section__sub">What rains down over the table when you win a hand or hit big in Slots.</p>
            <div className="shop-grid">
              {data.celebrations.map((item) => (
                <ShopCard
                  key={item.id}
                  item={item}
                  owned={item.price === 0 || data.owned.includes(item.id)}
                  equipped={data.equippedCelebration === item.id}
                  busy={busyId === item.id}
                  affordable={user.chips >= item.price}
                  onBuy={() => handleBuy(item)}
                  onEquip={() => handleEquip(item)}
                >
                  <CelebrationPreview id={item.id} />
                </ShopCard>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

// A frozen mid-fall snapshot rather than a live loop — same spirit as the
// static background swatches and card-skin previews above, just enough to
// tell the celebrations apart at a glance without every shop card
// animating at once.
function CelebrationPreview({ id }) {
  if (id === 'cele-chips') {
    return (
      <div className="celebration-preview">
        <span className="celebration-preview__chip" style={{ background: '#d81e3f', left: '20%', top: '10%' }} />
        <span className="celebration-preview__chip" style={{ background: '#2c8358', left: '55%', top: '35%' }} />
        <span className="celebration-preview__chip" style={{ background: '#7b4fb0', left: '35%', top: '60%' }} />
      </div>
    );
  }
  if (id === 'cele-cards') {
    return (
      <div className="celebration-preview">
        <span className="celebration-preview__card celebration-preview__card--red" style={{ left: '18%', top: '15%' }}>
          A♥
        </span>
        <span className="celebration-preview__card celebration-preview__card--black" style={{ left: '52%', top: '40%' }}>
          K♠
        </span>
        <span className="celebration-preview__card celebration-preview__card--red" style={{ left: '32%', top: '62%' }}>
          7♦
        </span>
      </div>
    );
  }
  if (id === 'cele-diamonds') {
    return (
      <div className="celebration-preview">
        <span className="celebration-preview__emoji" style={{ left: '20%', top: '12%', fontSize: '1.6rem' }}>💎</span>
        <span className="celebration-preview__emoji" style={{ left: '55%', top: '38%', fontSize: '1.2rem' }}>💎</span>
        <span className="celebration-preview__emoji" style={{ left: '35%', top: '60%', fontSize: '1.9rem' }}>💎</span>
      </div>
    );
  }
  if (id === 'cele-money') {
    return (
      <div className="celebration-preview">
        <span className="celebration-preview__emoji" style={{ left: '18%', top: '12%', fontSize: '1.6rem' }}>💵</span>
        <span className="celebration-preview__emoji" style={{ left: '55%', top: '40%', fontSize: '1.3rem' }}>💰</span>
        <span className="celebration-preview__emoji" style={{ left: '32%', top: '62%', fontSize: '1.7rem' }}>💸</span>
      </div>
    );
  }
  return (
    <div className="celebration-preview">
      <span className="celebration-preview__orb" style={{ left: '20%', top: '12%', width: '1.1rem', height: '1.1rem' }} />
      <span className="celebration-preview__orb" style={{ left: '55%', top: '40%', width: '0.8rem', height: '0.8rem' }} />
      <span className="celebration-preview__orb" style={{ left: '35%', top: '60%', width: '1.4rem', height: '1.4rem' }} />
    </div>
  );
}

function ShopCard({ item, owned, equipped, busy, affordable, onBuy, onEquip, children }) {
  return (
    <div className={`shop-item ${equipped ? 'shop-item--equipped' : ''}`}>
      <div className="shop-item__preview">{children}</div>
      <div className="shop-item__name">{item.name}</div>
      {!owned && <div className="shop-item__price">{formatChips(item.price)}</div>}
      {equipped ? (
        <div className="shop-item__equipped">Equipped</div>
      ) : owned ? (
        <button className="shop-item__btn shop-item__btn--equip" disabled={busy} onClick={onEquip}>
          {busy ? '…' : 'Equip'}
        </button>
      ) : (
        <button className="shop-item__btn shop-item__btn--buy" disabled={busy || !affordable} onClick={onBuy}>
          {busy ? '…' : affordable ? 'Buy' : 'Not enough'}
        </button>
      )}
    </div>
  );
}
