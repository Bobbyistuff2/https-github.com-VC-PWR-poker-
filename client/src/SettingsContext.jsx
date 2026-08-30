import { createContext, useContext, useEffect, useState } from 'react';
import { updateAudioSettings, unlockAudio, playClick, playHover } from './audio.js';

const STORAGE_KEY = 'pwr-poker-settings';
const DEFAULTS = { sound: true, music: true, musicVolume: 0.5, creativeMode: false };

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    updateAudioSettings(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore write failures (private browsing, storage full, etc.)
    }
  }, [settings]);

  useEffect(() => {
    // A single attribute on <html> is all creative-theme.css keys off of —
    // every page/component restyles instantly, no per-page wiring needed.
    document.documentElement.setAttribute('data-theme', settings.creativeMode ? 'creative' : 'classic');
  }, [settings.creativeMode]);

  useEffect(() => {
    // Browsers won't make sound until a real user gesture happens — unlock
    // (and, if enabled, start the music) on the first click/tap anywhere.
    function onFirstGesture() {
      unlockAudio();
      document.removeEventListener('pointerdown', onFirstGesture);
    }
    document.addEventListener('pointerdown', onFirstGesture, { once: true });

    // Global button click/hover sounds via event delegation, so every
    // button in the app gets the feedback automatically.
    let lastHovered = null;
    function onClick(e) {
      const target = e.target.closest('button, a[role="button"], .chip');
      if (target && !target.disabled) playClick();
    }
    function onPointerOver(e) {
      const target = e.target.closest('button, a[role="button"], .chip');
      if (target && target !== lastHovered && !target.disabled) {
        lastHovered = target;
        playHover();
      } else if (!target) {
        lastHovered = null;
      }
    }
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onPointerOver);

    return () => {
      document.removeEventListener('pointerdown', onFirstGesture);
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onPointerOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(partial) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  return (
    <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
