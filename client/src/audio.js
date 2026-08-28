// Self-contained sound engine built on the Web Audio API — no external
// audio files. Button clicks/hovers are short synthesized blips; the
// background music is a slow generative ambient pad loop. Everything is
// gated behind the user's settings (see SettingsContext.jsx) and behind a
// browser user-gesture, since AudioContext can't start on its own.

let ctx = null;
let musicMasterGain = null;
let musicTimer = null;
let musicStarted = false;

let settings = { sound: true, music: true, musicVolume: 0.5 };

export function updateAudioSettings(next) {
  settings = { ...settings, ...next };
  if (musicMasterGain) {
    const target = settings.music ? settings.musicVolume * 0.5 : 0;
    const ac = getCtx();
    musicMasterGain.gain.linearRampToValueAtTime(target, ac.currentTime + 0.25);
  }
  if (settings.music) startMusic();
}

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Call this once, from a real user gesture (the global click listener does
// this automatically) — browsers refuse to make sound before one.
export function unlockAudio() {
  getCtx();
  if (settings.music) startMusic();
}

export function playClick() {
  if (!settings.sound) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660, t);
  osc.frequency.exponentialRampToValueAtTime(240, t + 0.09);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.14);
}

// Short ascending arpeggio for a rank-up moment — distinct from the click/
// hover blips (longer, several notes, a triangle wave with a bell-ish
// decay) so it reads as a bigger deal than routine UI feedback.
export function playFanfare() {
  if (!settings.sound) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const start = t + i * 0.09;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

export function playHover() {
  if (!settings.sound) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1300, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.045, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

// Slow four-chord ambient loop (Am7 - Fmaj7 - Cmaj7 - G), soft sine/triangle
// pads through a lowpass filter with long attack/release envelopes.
const PROGRESSION = [
  [110.0, 130.81, 164.81, 196.0], // Am7
  [87.31, 110.0, 130.81, 164.81], // Fmaj7
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
  [98.0, 123.47, 146.83, 196.0], // G
];
const CHORD_SECONDS = 7.5;

function playPad(freqs, duration) {
  const ac = getCtx();
  const t = ac.currentTime;
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = f;
    osc.detune.value = (Math.random() - 0.5) * 6;

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 2.4);
    gain.gain.linearRampToValueAtTime(0.85, t + duration - 2.6);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    osc.connect(filter).connect(gain).connect(musicMasterGain);
    osc.start(t);
    osc.stop(t + duration + 0.1);
  });
}

export function startMusic() {
  const ac = getCtx();
  if (!musicMasterGain) {
    musicMasterGain = ac.createGain();
    musicMasterGain.gain.value = settings.music ? settings.musicVolume * 0.5 : 0;
    musicMasterGain.connect(ac.destination);
  }
  if (musicStarted) return;
  musicStarted = true;
  let i = 0;
  const step = () => {
    playPad(PROGRESSION[i % PROGRESSION.length], CHORD_SECONDS);
    i += 1;
    musicTimer = setTimeout(step, CHORD_SECONDS * 1000 * 0.92);
  };
  step();
}

export function stopMusicScheduling() {
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
  musicStarted = false;
}
