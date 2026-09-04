import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RankBadge from '../components/RankBadge.jsx';
import { api } from '../api.js';
import { formatChips, parseChipsInput } from '../chips.js';
import './Gift.css';

export default function Gift({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [amountText, setAmountText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const debounceRef = useRef(null);

  // Search-as-you-type, debounced — skipped entirely once a recipient is
  // picked, so re-searching only happens if the player actually edits the
  // name again (see the search input's onChange, which clears `recipient`).
  useEffect(() => {
    if (recipient) return undefined;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchUsers(q)
        .then(({ users }) => setResults(users))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, recipient]);

  if (!user) {
    navigate('/');
    return null;
  }

  function pickRecipient(picked) {
    setRecipient(picked);
    setResults([]);
    setQuery(picked.name);
    setSuccess(null);
    setError('');
  }

  function clearRecipient() {
    setRecipient(null);
    setQuery('');
    setSuccess(null);
  }

  const amount = parseChipsInput(amountText);
  const validAmount = amount !== null && amount > 0;
  const tooMuch = validAmount && amount > user.chips;

  async function handleSend() {
    if (!recipient || !validAmount || busy || tooMuch) return;
    setBusy(true);
    setError('');
    setSuccess(null);
    try {
      const res = await api.sendGift(recipient.id, amount);
      onUserUpdate({ ...user, chips: res.chips });
      // Reset the form for another gift, but not through clearRecipient() —
      // that also clears `success`, which would wipe out the very message
      // being set on this same line.
      setRecipient(null);
      setQuery('');
      setAmountText('');
      setSuccess({ amount: res.amount, name: res.recipientName });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  let sendLabel = 'Pick a player first';
  if (recipient) sendLabel = validAmount ? `Send ${formatChips(amount)} to ${recipient.name}` : 'Enter an amount';
  if (busy) sendLabel = 'Sending…';

  return (
    <div className="gift-page">
      <header className="gift-header">
        <button className="gift-header__back" onClick={() => navigate('/lobby')}>
          <span className="gift-header__back__arrow">←</span> Lobby
        </button>
        <h1 className="gift-header__title">Gift Chips</h1>
        <div className="gift-header__chips">{formatChips(user.chips)}</div>
      </header>

      <main className="gift-main">
        <div className="gift-panel">
          <h2 className="gift-panel__title">Send chips to another player</h2>
          <p className="gift-panel__sub">Search by name, pick who, send as much as you want.</p>

          <div className="gift-search">
            <input
              className="gift-search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setRecipient(null);
              }}
              placeholder="Search by name…"
              autoComplete="off"
              disabled={busy}
            />
            {recipient && (
              <button className="gift-search-clear" onClick={clearRecipient} aria-label="Change recipient">
                ✕
              </button>
            )}
          </div>

          {!recipient && searching && <p className="gift-status">Searching…</p>}
          {!recipient && !searching && query.trim() && results.length === 0 && (
            <p className="gift-status">No players found.</p>
          )}

          {!recipient && results.length > 0 && (
            <div className="gift-results">
              {results.map((u) => (
                <button key={u.id} className="gift-result" onClick={() => pickRecipient(u)}>
                  {u.picture ? (
                    <img className="gift-result__avatar" src={u.picture} alt="" />
                  ) : (
                    <div className="gift-result__avatar gift-result__avatar--fallback">{u.name.charAt(0).toUpperCase()}</div>
                  )}
                  <span className="gift-result__name">{u.name}</span>
                  <RankBadge rank={u.rank} size="compact" />
                </button>
              ))}
            </div>
          )}

          {recipient && (
            <div className="gift-recipient">
              {recipient.picture ? (
                <img className="gift-recipient__avatar" src={recipient.picture} alt="" />
              ) : (
                <div className="gift-recipient__avatar gift-recipient__avatar--fallback">
                  {recipient.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="gift-recipient__info">
                <div className="gift-recipient__name">{recipient.name}</div>
                <RankBadge rank={recipient.rank} size="compact" />
              </div>
            </div>
          )}

          <div className="gift-amount-row">
            <span className="gift-amount-label">Amount</span>
            <input
              type="text"
              inputMode="decimal"
              className="gift-amount-input"
              placeholder="e.g. 10k"
              value={amountText}
              disabled={!recipient || busy}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </div>

          {tooMuch && <p className="gift-message gift-message--error">You don't have that many chips.</p>}
          {error && <p className="gift-message gift-message--error">{error}</p>}
          {success && (
            <p className="gift-message gift-message--success">
              Sent {formatChips(success.amount)} to {success.name}!
            </p>
          )}

          <button
            className="gift-send-btn"
            disabled={!recipient || !validAmount || busy || tooMuch}
            onClick={handleSend}
          >
            {sendLabel}
          </button>
        </div>
      </main>
    </div>
  );
}
