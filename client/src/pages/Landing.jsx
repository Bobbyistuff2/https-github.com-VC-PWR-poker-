import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FallingCards from '../components/FallingCards.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { api } from '../api.js';
import './Landing.css';

// Empty when unset, so the link is relative to the current origin — used in
// production where Vercel proxies /auth through to the Render backend.
const API_URL = import.meta.env.VITE_API_URL || '';

export default function Landing({ onSignedIn }) {
  const [step, setStep] = useState('choose');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const discordError = searchParams.get('error') === 'discord';

  async function handleGuestSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1800));
    try {
      const [{ user }] = await Promise.all([api.guestLogin(name, phone, password), minDelay]);
      onSignedIn(user);
      navigate('/lobby');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1800));
    try {
      const [{ user }] = await Promise.all([api.login(loginName, loginPassword), minDelay]);
      onSignedIn(user);
      navigate('/lobby');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function backToChoose() {
    setStep('choose');
    setError('');
  }

  return (
    <div className="landing">
      <FallingCards />
      <div className="landing__content">
        <div className="landing__suits">
          <span className="landing__suit landing__suit--1">♠</span>
          <span className="landing__suit landing__suit--2">♥</span>
          <span className="landing__suit landing__suit--3">♣</span>
          <span className="landing__suit landing__suit--4">♦</span>
        </div>
        <h1 className="landing__title">PWR Poker</h1>
        <p className="landing__subtitle">Deal yourself in. Play with friends or a bot, anywhere.</p>

        {discordError && (
          <p className="landing__error">Discord sign-in failed. Please try again.</p>
        )}

        {submitting ? (
          <div className="landing__loading">
            <LoadingSpinner size={80} label="Dealing you in…" />
          </div>
        ) : step === 'choose' ? (
          <>
            <a className="landing__discord" href={`${API_URL}/auth/discord`}>
              <DiscordIcon />
              Sign in with Discord
            </a>

            <div className="landing__divider">
              <span>or</span>
            </div>

            <button className="landing__guest-btn" type="button" onClick={() => setStep('guestForm')}>
              Log in as Guest
            </button>
            <button className="landing__login-btn" type="button" onClick={() => setStep('login')}>
              Log In to Your Account
            </button>
          </>
        ) : step === 'guestForm' ? (
          <form className="landing__guest" onSubmit={handleGuestSubmit}>
            <input
              className="landing__input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoFocus
              required
            />
            <input
              className="landing__input"
              placeholder="Make a password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              maxLength={72}
              required
            />
            <input
              className="landing__input"
              placeholder="Phone number (optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
            />
            {error && <p className="landing__error">{error}</p>}
            <button className="landing__guest-btn" type="submit" disabled={submitting}>
              {submitting ? 'Joining…' : 'Continue'}
            </button>
            <button className="landing__back-btn" type="button" onClick={backToChoose}>
              ← Back
            </button>
          </form>
        ) : (
          <form className="landing__guest" onSubmit={handleLoginSubmit}>
            <input
              className="landing__input"
              placeholder="Enter your name"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              maxLength={24}
              autoFocus
              required
            />
            <input
              className="landing__input"
              placeholder="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              maxLength={72}
              required
            />
            {error && <p className="landing__error">{error}</p>}
            <button className="landing__guest-btn" type="submit" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log In'}
            </button>
            <button className="landing__back-btn" type="button" onClick={backToChoose}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.457.881-.63 1.282a18.27 18.27 0 0 0-5.51 0A12.6 12.6 0 0 0 9.115 3a19.74 19.74 0 0 0-4.435 1.372C1.578 8.943.813 13.395 1.196 17.786a19.9 19.9 0 0 0 5.993 3.03c.483-.66.914-1.36 1.285-2.098a12.9 12.9 0 0 1-2.023-.973c.17-.124.336-.253.497-.386 3.9 1.8 8.13 1.8 11.986 0 .163.133.328.262.497.386-.646.387-1.324.71-2.026.974.372.738.802 1.44 1.285 2.097a19.86 19.86 0 0 0 6-3.03c.5-5.094-.838-9.505-3.373-13.417ZM8.02 15.331c-1.174 0-2.14-1.083-2.14-2.414 0-1.332.945-2.415 2.14-2.415 1.205 0 2.16 1.093 2.14 2.415 0 1.331-.945 2.414-2.14 2.414Zm7.96 0c-1.174 0-2.14-1.083-2.14-2.414 0-1.332.944-2.415 2.14-2.415 1.204 0 2.16 1.093 2.14 2.415 0 1.331-.936 2.414-2.14 2.414Z" />
    </svg>
  );
}
