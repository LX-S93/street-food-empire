// Sound effects and background music, synthesised with the Web Audio API.
// No audio files: everything is generated on the fly, so it works offline and adds
// nothing to the download. Browsers (iOS Safari in particular) only allow audio after
// a user gesture, so the context is created on the first tap.

export type Sfx =
  | 'tap' | 'cash' | 'coin' | 'ding' | 'warn' | 'burn' | 'sizzle' | 'jingle' | 'pop';

interface Settings { sfx: boolean; music: boolean; }

const KEY = 'sfe-sound';
let settings: Settings = { sfx: true, music: true };
try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (raw) settings = { ...settings, ...JSON.parse(raw) };
} catch { /* defaults */ }

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;

function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx ? 1 : 0; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? 0.22 : 0; musicBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, bus: GainNode, glide?: number): void {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(bus);
  o.start(start); o.stop(start + dur + 0.05);
}

function hiss(start: number, dur: number, vol: number, freq: number, bus: GainNode): void {
  if (!ctx || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f); f.connect(g); g.connect(bus);
  src.start(start, Math.random() * 0.5); src.stop(start + dur + 0.05);
}

export function sfx(name: Sfx): void {
  if (!settings.sfx || !ensure() || !ctx || !sfxBus) return;
  if (ctx.state !== 'running') return;
  const t = ctx.currentTime, b = sfxBus;
  switch (name) {
    case 'tap': tone(880, t, 0.05, 'triangle', 0.08, b); break;
    case 'pop': tone(520, t, 0.08, 'sine', 0.18, b, 900); break;
    case 'ding': tone(1318, t, 0.35, 'sine', 0.22, b); tone(1976, t + 0.06, 0.3, 'sine', 0.1, b); break;
    case 'coin': tone(988, t, 0.09, 'square', 0.07, b); tone(1319, t + 0.08, 0.25, 'square', 0.07, b); break;
    case 'cash':
      hiss(t, 0.08, 0.15, 3000, b);
      tone(1568, t + 0.05, 0.5, 'sine', 0.2, b); tone(2093, t + 0.12, 0.6, 'sine', 0.16, b);
      break;
    case 'warn': tone(330, t, 0.16, 'sawtooth', 0.07, b); tone(262, t + 0.16, 0.24, 'sawtooth', 0.07, b); break;
    case 'burn': hiss(t, 0.5, 0.25, 600, b); tone(160, t, 0.4, 'sawtooth', 0.06, b, 90); break;
    case 'sizzle': hiss(t, 0.7, 0.18, 5200, b); hiss(t + 0.05, 0.6, 0.1, 2500, b); break;
    case 'jingle': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.35, 'triangle', 0.16, b)); break;
  }
}

/* ----- phone ringing (UK style double ring, repeated while active) ----- */
let ringTimer: number | null = null;
export function ring(on: boolean): void {
  if (!on) { if (ringTimer != null) { clearInterval(ringTimer); ringTimer = null; } return; }
  if (ringTimer != null || !settings.sfx || typeof window === 'undefined') return;
  const burst = () => {
    if (!ensure() || !ctx || !sfxBus || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    for (const off of [0, 0.6]) { tone(440, t + off, 0.4, 'sine', 0.12, sfxBus); tone(480, t + off, 0.4, 'sine', 0.12, sfxBus); }
  };
  burst();
  ringTimer = window.setInterval(burst, 2400);
}

/* ----- background music: a gentle generative loop ----- */
const CHORDS = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]]; // C, Am, F, G
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76];
let musicTimer: number | null = null;
let nextBar = 0, bar = 0;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function scheduleMusic(): void {
  if (!ctx || !musicBus || ctx.state !== 'running') return;
  const beat = 60 / 84;
  while (nextBar < ctx.currentTime + 1.5) {
    const ch = CHORDS[bar % CHORDS.length];
    ch.forEach((m, i) => tone(mtof(m), nextBar + i * 0.02, beat * 4, 'triangle', 0.05, musicBus as GainNode));
    for (let s = 0; s < 8; s++) {
      if (Math.random() < 0.45) {
        const m = SCALE[Math.floor(Math.random() * SCALE.length)];
        tone(mtof(m), nextBar + s * beat / 2, beat * 0.9, 'sine', 0.06, musicBus as GainNode);
      }
    }
    tone(mtof(ch[0] - 12), nextBar, beat * 1.5, 'sine', 0.09, musicBus as GainNode);
    tone(mtof(ch[0] - 12), nextBar + beat * 2, beat * 1.5, 'sine', 0.07, musicBus as GainNode);
    nextBar += beat * 4; bar++;
  }
}

function startMusic(): void {
  if (musicTimer != null || !settings.music || !ctx) return;
  nextBar = ctx.currentTime + 0.1;
  musicTimer = window.setInterval(scheduleMusic, 400);
}

function stopMusic(): void {
  if (musicTimer != null) { clearInterval(musicTimer); musicTimer = null; }
}

/* ----- settings and lifecycle ----- */
export function soundSettings(): Settings { return { ...settings }; }

export function setSfx(on: boolean): void {
  settings.sfx = on; save();
  if (sfxBus) sfxBus.gain.value = on ? 1 : 0;
  if (!on) ring(false);
}

export function setMusic(on: boolean): void {
  settings.music = on; save();
  if (musicBus) musicBus.gain.value = on ? 0.22 : 0;
  if (on) { ensure(); startMusic(); } else stopMusic();
}

export function initAudio(): void {
  if (typeof document === 'undefined') return;
  const unlock = () => {
    const c = ensure();
    if (!c) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    startMusic();
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  });
}
