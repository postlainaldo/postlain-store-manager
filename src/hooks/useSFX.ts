"use client";

/**
 * useSFX — Chill synthetic UI sounds via Web Audio API.
 * No files needed. Unlocks AudioContext on first user interaction.
 * All sounds are warm, soft, and lounge-y.
 */

// ── Singleton AudioContext ─────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
let _unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      const AC = window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)["webkitAudioContext"];
      if (!AC) return null;
      _ctx = new AC();
    } catch { return null; }
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

/**
 * Call this once on first user gesture (click/touch) to unlock AudioContext.
 * Registered globally in AudioUnlocker component.
 */
export function unlockAudio() {
  if (_unlocked) return;
  const ac = getCtx();
  if (!ac) return;
  // Create and immediately stop a silent buffer — this counts as user-gesture audio
  const buf = ac.createBuffer(1, 1, ac.sampleRate);
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(ac.destination);
  src.start(0);
  src.stop(0.001);
  _unlocked = true;
}

// ── DSP helpers ───────────────────────────────────────────────────────────────

/** Master bus with soft limiter feel */
function bus(ac: AudioContext, vol = 1.0): GainNode {
  const g = ac.createGain();
  g.gain.value = 0.38 * vol; // generous — chill sounds need presence
  g.connect(ac.destination);
  return g;
}

/** Simple reverb via convolution (impulse response generated inline) */
function makeReverb(ac: AudioContext, duration = 1.2, decay = 3.0): ConvolverNode {
  const rate = ac.sampleRate;
  const len  = Math.floor(rate * duration);
  const buf  = ac.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  const conv = ac.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Build: dry gain -> [reverb -> wet gain -> dest], returns dry input node */
function reverbBus(ac: AudioContext, dest: AudioNode, wetMix = 0.35): GainNode {
  const dry = ac.createGain();
  dry.gain.value = 1 - wetMix;
  dry.connect(dest);

  const verb = makeReverb(ac);
  const wet  = ac.createGain();
  wet.gain.value = wetMix;
  verb.connect(wet);
  wet.connect(dest);

  const input = ac.createGain();
  input.connect(dry);
  input.connect(verb);
  return input;
}

/** Sine oscillator with ADSR-like envelope */
function tone(
  ac: AudioContext,
  out: AudioNode,
  freq: number,
  t: number,
  attack: number,
  sustain: number,
  release: number,
  peak = 0.7,
  type: OscillatorType = "sine",
) {
  const env = ac.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + attack);
  env.gain.setValueAtTime(peak, t + attack + sustain);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + sustain + release);
  env.connect(out);

  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(env);
  o.start(t);
  o.stop(t + attack + sustain + release + 0.05);
}

/** Chord — multiple tones at once */
function chord(ac: AudioContext, out: AudioNode, freqs: number[], t: number, attack: number, sustain: number, release: number, peak = 0.55) {
  for (const f of freqs) tone(ac, out, f, t, attack, sustain, release, peak / freqs.length);
}

// ── Sound Library — Chill Edition ─────────────────────────────────────────────

const SFX = {

  /** Feather tap — nav links, generic buttons */
  tap() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.9);
    const rev = reverbBus(ac, out, 0.25);
    const t = ac.currentTime;
    // Soft marimba-like click: fundamental + 2nd partial
    tone(ac, rev, 1047, t, 0.003, 0.01, 0.18, 0.65); // C6
    tone(ac, rev, 2093, t, 0.003, 0.005, 0.12, 0.20); // C7
  },

  /** Even softer — cancel / secondary */
  softTap() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.75);
    const rev = reverbBus(ac, out, 0.30);
    const t = ac.currentTime;
    tone(ac, rev, 880, t, 0.004, 0.01, 0.20, 0.50); // A5
  },

  /** Page navigate — gentle ascending two-note */
  navigate() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.85);
    const rev = reverbBus(ac, out, 0.40);
    const t = ac.currentTime;
    tone(ac, rev, 659, t,        0.004, 0.01, 0.22, 0.55); // E5
    tone(ac, rev, 988, t + 0.10, 0.004, 0.01, 0.28, 0.50); // B5
  },

  /** Modal open — warm rising whoosh */
  modalOpen() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.80);
    const rev = reverbBus(ac, out, 0.45);
    const t = ac.currentTime;
    tone(ac, rev, 523, t,        0.008, 0.02, 0.30, 0.45); // C5
    tone(ac, rev, 784, t + 0.08, 0.006, 0.01, 0.28, 0.40); // G5
    tone(ac, rev, 1047, t + 0.16, 0.005, 0.01, 0.24, 0.28); // C6
  },

  /** Modal close — descending sigh */
  modalClose() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.75);
    const rev = reverbBus(ac, out, 0.40);
    const t = ac.currentTime;
    tone(ac, rev, 784,  t,        0.004, 0.01, 0.25, 0.45); // G5
    tone(ac, rev, 523,  t + 0.10, 0.004, 0.01, 0.30, 0.38); // C5
  },

  /** Save / confirm — warm major chord strum */
  save() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.85);
    const rev = reverbBus(ac, out, 0.50);
    const t = ac.currentTime;
    // C major arpeggio: C4–E4–G4–C5
    tone(ac, rev, 262, t,         0.006, 0.02, 0.35, 0.50); // C4
    tone(ac, rev, 330, t + 0.06,  0.005, 0.02, 0.32, 0.45); // E4
    tone(ac, rev, 392, t + 0.12,  0.005, 0.02, 0.30, 0.42); // G4
    tone(ac, rev, 523, t + 0.18,  0.005, 0.01, 0.40, 0.55); // C5
  },

  /** Login submit — quiet anticipation chime */
  loginSubmit() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.80);
    const rev = reverbBus(ac, out, 0.40);
    const t = ac.currentTime;
    tone(ac, rev, 440, t,        0.006, 0.02, 0.30, 0.48); // A4
    tone(ac, rev, 554, t + 0.08, 0.005, 0.01, 0.28, 0.40); // C#5
  },

  /** Login success — bright ascending fanfare */
  loginSuccess() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.90);
    const rev = reverbBus(ac, out, 0.55);
    const t = ac.currentTime;
    // G major pentatonic rise
    tone(ac, rev, 392,  t,         0.006, 0.02, 0.40, 0.52); // G4
    tone(ac, rev, 494,  t + 0.08,  0.005, 0.02, 0.38, 0.50); // B4
    tone(ac, rev, 587,  t + 0.16,  0.005, 0.02, 0.36, 0.52); // D5
    tone(ac, rev, 784,  t + 0.24,  0.006, 0.02, 0.50, 0.60); // G5
    tone(ac, rev, 1175, t + 0.34,  0.005, 0.01, 0.55, 0.45); // D6
  },

  /** Error — gentle descending minor 3rd, not harsh */
  error() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.80);
    const rev = reverbBus(ac, out, 0.35);
    const t = ac.currentTime;
    tone(ac, rev, 440, t,        0.005, 0.02, 0.32, 0.50); // A4
    tone(ac, rev, 370, t + 0.12, 0.005, 0.02, 0.35, 0.45); // F#4 — minor feel
  },

  /** Destroy / delete — low soft thud */
  destroy() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.80);
    const rev = reverbBus(ac, out, 0.30);
    const t = ac.currentTime;
    tone(ac, rev, 196, t,        0.010, 0.02, 0.30, 0.60, "sine"); // G3
    tone(ac, rev, 147, t + 0.10, 0.008, 0.01, 0.35, 0.45, "sine"); // D3
  },

  /** Notification — soft crystal ping */
  notify() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.85);
    const rev = reverbBus(ac, out, 0.60);
    const t = ac.currentTime;
    // Crystal bell chord
    chord(ac, rev, [1047, 1319, 1568], t, 0.004, 0.01, 0.55, 0.65); // C6 E6 G6
  },

  /** App boot / splash — cinematic ambient swell */
  boot() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.90);
    const rev = reverbBus(ac, out, 0.65);
    const t = ac.currentTime;
    // Sub bass breath
    tone(ac, rev, 65,  t,         0.20, 0.30, 0.80, 0.40); // C2
    tone(ac, rev, 130, t + 0.10,  0.15, 0.20, 0.70, 0.30); // C3
    // Pad chord swell — Cmaj7
    tone(ac, rev, 262, t + 0.20,  0.18, 0.25, 0.80, 0.35); // C4
    tone(ac, rev, 330, t + 0.28,  0.16, 0.22, 0.75, 0.32); // E4
    tone(ac, rev, 392, t + 0.36,  0.14, 0.20, 0.70, 0.30); // G4
    tone(ac, rev, 494, t + 0.44,  0.12, 0.18, 0.65, 0.28); // B4
    // Top sparkle
    tone(ac, rev, 1047, t + 0.55, 0.008, 0.01, 0.60, 0.38); // C6
    tone(ac, rev, 1319, t + 0.65, 0.006, 0.01, 0.55, 0.28); // E6
  },

  /** Register / join — warm acceptance note */
  scan() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.80);
    const rev = reverbBus(ac, out, 0.45);
    const t = ac.currentTime;
    tone(ac, rev, 659, t,        0.005, 0.02, 0.30, 0.52); // E5
    tone(ac, rev, 784, t + 0.10, 0.005, 0.01, 0.30, 0.45); // G5
  },
};

export type SFXName = keyof typeof SFX;

export function playSound(name: SFXName) {
  if (typeof window === "undefined") return;
  // Do NOT gate on prefers-reduced-motion — that's for animation, not sound
  // Users can mute via OS volume
  try {
    SFX[name]();
  } catch {
    // silently ignore — never crash the UI for sound errors
  }
}

/** React hook */
export function useSFX() {
  return playSound;
}
