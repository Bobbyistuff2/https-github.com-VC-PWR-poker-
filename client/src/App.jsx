import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Profile from './pages/Profile.jsx';
import Lobby from './pages/Lobby.jsx';
import Table from './pages/Table.jsx';
import Rewards from './pages/Rewards.jsx';
import Wheel from './pages/Wheel.jsx';
import HiLo from './pages/HiLo.jsx';
import Shop from './pages/Shop.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TermsModal from './components/TermsModal.jsx';
import RankUpCelebration from './components/RankUpCelebration.jsx';
import { SettingsProvider } from './SettingsContext.jsx';
import { api } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [rankUpEvent, setRankUpEvent] = useState(null);
  // undefined = "haven't established a baseline yet" (nothing to compare a
  // fresh page load against, so the very first user we see never
  // celebrates); a real number afterwards.
  const prevRankIndexRef = useRef(undefined);

  // Every place chips/rank can change (Table, Wheel, Lobby, /profile,
  // accepting terms) already funnels through this one setter, so this is
  // the single place that needs to notice a promotion and fire the
  // celebration — nothing downstream has to know about it.
  function updateUser(next) {
    if (next?.rank && prevRankIndexRef.current !== undefined && next.rank.index > prevRankIndexRef.current) {
      setRankUpEvent(next.rank);
    }
    prevRankIndexRef.current = next?.rank?.index;
    setUser(next);
  }

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1800));
    Promise.all([api.me().then(({ user }) => updateUser(user)).catch(() => setUser(null)), minDelay]).finally(
      () => setChecking(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="app-loading">
        <LoadingSpinner size={88} label="Dealing you in…" />
      </div>
    );
  }

  // Gate everyone — fresh signups and returning accounts alike — behind
  // accepting the terms once, right after they land from the Google/Discord
  // callback. Profile setup happens first for new accounts, so this only
  // ever blocks someone who already has a name and is otherwise ready to
  // play. Once terms_accepted_at is set server-side it stays set, so this
  // never shows again except via the read-only copy in Settings.
  if (user && user.profileComplete && !user.termsAccepted) {
    return (
      <SettingsProvider>
        <TermsModal variant="gate" onAccept={updateUser} onDecline={() => setUser(null)} />
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={user.profileComplete ? '/lobby' : '/profile'} replace />
            ) : (
              <Landing />
            )
          }
        />
        <Route path="/profile" element={<Profile user={user} onSignedIn={updateUser} />} />
        <Route
          path="/lobby"
          element={<Lobby user={user} onSignedOut={() => setUser(null)} onUserUpdate={updateUser} />}
        />
        <Route path="/table/:code" element={<Table user={user} onUserUpdate={updateUser} />} />
        <Route path="/rewards" element={<Rewards user={user} />} />
        <Route path="/wheel" element={<Wheel user={user} onUserUpdate={updateUser} />} />
        <Route path="/hilo" element={<HiLo user={user} onUserUpdate={updateUser} />} />
        <Route path="/shop" element={<Shop user={user} onUserUpdate={updateUser} />} />
        <Route path="/leaderboard" element={<Leaderboard user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SettingsPanel user={user} />
      <RankUpCelebration rank={rankUpEvent} onDone={() => setRankUpEvent(null)} />
    </SettingsProvider>
  );
}
