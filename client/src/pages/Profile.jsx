import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FallingCards from '../components/FallingCards.jsx';
import DealTransition from '../components/DealTransition.jsx';
import { api } from '../api.js';
import './Profile.css';

export default function Profile({ user, onSignedIn }) {
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { user: updated } = await api.saveProfile(name);
      onSignedIn(updated);
      navigate('/lobby');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <DealTransition />
      <FallingCards count={16} />
      <form className="profile-card" onSubmit={handleSubmit}>
        <img className="profile-card__avatar" src={user.picture} alt="" />
        <h1 className="profile-card__title">Set up your profile</h1>
        <p className="profile-card__subtitle">This is how friends will see you at the table.</p>
        <label className="profile-card__label" htmlFor="name">
          Display name
        </label>
        <input
          id="name"
          className="profile-card__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoFocus
          required
        />
        {error && <p className="profile-card__error">{error}</p>}
        <button className="profile-card__submit" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Enter the table'}
        </button>
      </form>
    </div>
  );
}
