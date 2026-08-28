import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Profile from './pages/Profile.jsx';
import Lobby from './pages/Lobby.jsx';
import Table from './pages/Table.jsx';
import Rewards from './pages/Rewards.jsx';
import Wheel from './pages/Wheel.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { SettingsProvider } from './SettingsContext.jsx';
import { api } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1800));
    Promise.all([api.me().then(({ user }) => setUser(user)).catch(() => setUser(null)), minDelay]).finally(
      () => setChecking(false)
    );
  }, []);

  if (checking) {
    return (
      <div className="app-loading">
        <LoadingSpinner size={88} label="Dealing you in…" />
      </div>
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
        <Route path="/profile" element={<Profile user={user} onSignedIn={setUser} />} />
        <Route
          path="/lobby"
          element={<Lobby user={user} onSignedOut={() => setUser(null)} onUserUpdate={setUser} />}
        />
        <Route path="/table/:code" element={<Table user={user} onUserUpdate={setUser} />} />
        <Route path="/rewards" element={<Rewards user={user} />} />
        <Route path="/wheel" element={<Wheel user={user} onUserUpdate={setUser} />} />
        <Route path="/leaderboard" element={<Leaderboard user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SettingsPanel />
    </SettingsProvider>
  );
}
