import { useSearchParams } from 'react-router-dom';
import FallingCards from '../components/FallingCards.jsx';
import './Landing.css';

// Empty when unset, so the link is relative to the current origin — used in
// production where Vercel proxies /auth through to the Render backend.
const API_URL = import.meta.env.VITE_API_URL || '';

export default function Landing() {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('error');

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

        {authError === 'discord' && <p className="landing__error">Discord sign-in failed. Please try again.</p>}
        {authError === 'google' && <p className="landing__error">Google sign-in failed. Please try again.</p>}

        <a className="landing__discord" href={`${API_URL}/auth/discord`}>
          <DiscordIcon />
          Sign in with Discord
        </a>

        <a className="landing__google" href={`${API_URL}/auth/google`}>
          <GoogleIcon />
          Sign in with Google
        </a>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
