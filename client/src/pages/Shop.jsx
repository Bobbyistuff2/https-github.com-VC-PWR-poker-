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

  async function handleEquip(item) {
    setBusyId(item.id);
    setError('');
    try {
      await api.equipItem(item.id);
      if (item.slot === 'background') {
        onUserUpdate({ ...user, equippedBackground: item.id });
        setData((prev) => ({ ...prev, equippedBackground: item.id }));
      } else {
        onUserUpdate({ ...user, equippedCardSkin: item.id });
        setData((prev) => ({ ...prev, equippedCardSkin: item.id }));
      }
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
        </main>
      )}
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
