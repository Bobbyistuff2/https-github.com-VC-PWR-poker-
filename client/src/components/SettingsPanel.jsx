import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../SettingsContext.jsx';
import { api } from '../api.js';
import TermsModal from './TermsModal.jsx';
import './SettingsPanel.css';

export default function SettingsPanel({ user, onSignedOut }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const { settings, update } = useSettings();

  async function handleLogout() {
    setOpen(false);
    await api.logout();
    onSignedOut();
    navigate('/');
  }

  return (
    <>
      <button
        className={`settings-toggle ${open ? 'settings-toggle--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
      >
        <GearIcon />
      </button>

      <div className={`settings-panel ${open ? 'settings-panel--open' : ''}`}>
        <div className="settings-panel__header">
          <h2>Settings</h2>
          <button className="settings-panel__close" onClick={() => setOpen(false)} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__label">Button Sounds</div>
            <div className="settings-row__desc">Little clicks and hover blips on buttons.</div>
          </div>
          <Switch checked={settings.sound} onChange={(v) => update({ sound: v })} />
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__label">Background Music</div>
            <div className="settings-row__desc">A relaxing ambient loop while you play.</div>
          </div>
          <Switch checked={settings.music} onChange={(v) => update({ music: v })} />
        </div>

        <div className="settings-row settings-row--slider">
          <div className="settings-row__text">
            <div className="settings-row__label">Music Volume</div>
          </div>
          <input
            className="settings-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.musicVolume}
            disabled={!settings.music}
            onChange={(e) => update({ musicVolume: Number(e.target.value) })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__label">Terms of Service</div>
            <div className="settings-row__desc">Review what you agreed to when you signed in.</div>
          </div>
          <button className="settings-row__link" onClick={() => setTermsOpen(true)}>
            View
          </button>
        </div>

        {user && (
          <button className="settings-panel__logout" onClick={handleLogout}>
            Sign out
          </button>
        )}
      </div>

      {open && <div className="settings-backdrop" onClick={() => setOpen(false)} />}
      {termsOpen && (
        <TermsModal variant="view" acceptedAt={user?.termsAcceptedAt} onClose={() => setTermsOpen(false)} />
      )}
    </>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      className={`settings-switch ${checked ? 'settings-switch--on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch__knob" />
    </button>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
