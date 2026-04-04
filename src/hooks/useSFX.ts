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

// ── Sound Library — Dark Premium Blue Edition ─────────────────────────────────

const SFX = {

  /** Feather tap — nav links, generic buttons */
  tap() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.9);
    const rev = reverbBus(ac, out, 0.28);
    const t = ac.currentTime;
    tone(ac, rev, 1047, t, 0.002, 0.008, 0.16, 0.68); // C6 — crisp marimba
    tone(ac, rev, 2093, t, 0.002, 0.004, 0.10, 0.22); // C7 — air partial
    tone(ac, rev, 3136, t, 0.001, 0.002, 0.06, 0.10); // G7 — ultra-air shimmer
  },

  /** Even softer — cancel / secondary / dismiss */
  softTap() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.72);
    const rev = reverbBus(ac, out, 0.32);
    const t = ac.currentTime;
    tone(ac, rev, 880,  t,        0.003, 0.008, 0.22, 0.50); // A5
    tone(ac, rev, 1320, t + 0.04, 0.002, 0.004, 0.14, 0.22); // E6 overtone
  },

  /** Page navigate — premium rising two-note with tail shimmer */
  navigate() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.85);
    const rev = reverbBus(ac, out, 0.42);
    const t = ac.currentTime;
    tone(ac, rev, 659,  t,        0.003, 0.01, 0.22, 0.55); // E5
    tone(ac, rev, 988,  t + 0.10, 0.003, 0.01, 0.30, 0.52); // B5
    tone(ac, rev, 1319, t + 0.20, 0.002, 0.005, 0.24, 0.28); // E6 — shimmer
  },

  /** FAB open — cinematic bloom: deep bass + rising chord */
  modalOpen() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.88);
    const rev = reverbBus(ac, out, 0.55);
    const t = ac.currentTime;
    tone(ac, rev, 130,  t,        0.015, 0.04, 0.40, 0.45); // C3 — sub bloom
    tone(ac, rev, 523,  t + 0.05, 0.008, 0.02, 0.32, 0.42); // C5
    tone(ac, rev, 784,  t + 0.12, 0.006, 0.015, 0.30, 0.38); // G5
    tone(ac, rev, 1047, t + 0.20, 0.005, 0.01, 0.26, 0.32); // C6
    tone(ac, rev, 1568, t + 0.30, 0.003, 0.005, 0.24, 0.18); // G6 — sparkle tail
  },

  /** FAB close / modal dismiss — graceful exhale */
  modalClose() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.78);
    const rev = reverbBus(ac, out, 0.42);
    const t = ac.currentTime;
    tone(ac, rev, 1047, t,        0.003, 0.01, 0.22, 0.40); // C6
    tone(ac, rev, 784,  t + 0.08, 0.004, 0.01, 0.26, 0.38); // G5
    tone(ac, rev, 523,  t + 0.18, 0.005, 0.01, 0.32, 0.35); // C5
    tone(ac, rev, 262,  t + 0.30, 0.008, 0.02, 0.40, 0.28); // C4 — grounding bass
  },

  /** Save / confirm — warm Cmaj7 arpeggio with gold shimmer */
  save() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.88);
    const rev = reverbBus(ac, out, 0.52);
    const t = ac.currentTime;
    tone(ac, rev, 262,  t,        0.006, 0.02, 0.38, 0.52); // C4
    tone(ac, rev, 330,  t + 0.06, 0.005, 0.02, 0.34, 0.48); // E4
    tone(ac, rev, 392,  t + 0.12, 0.005, 0.02, 0.32, 0.45); // G4
    tone(ac, rev, 494,  t + 0.18, 0.004, 0.015, 0.35, 0.42); // B4 — maj7 colour
    tone(ac, rev, 523,  t + 0.24, 0.004, 0.01, 0.42, 0.55); // C5
    tone(ac, rev, 1047, t + 0.32, 0.003, 0.005, 0.50, 0.28); // C6 — gold shimmer
  },

  /** Login submit — subtle anticipation with suspended chord */
  loginSubmit() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.82);
    const rev = reverbBus(ac, out, 0.42);
    const t = ac.currentTime;
    tone(ac, rev, 440,  t,        0.006, 0.02, 0.30, 0.50); // A4
    tone(ac, rev, 587,  t + 0.06, 0.005, 0.015, 0.28, 0.42); // D5 — sus4
    tone(ac, rev, 659,  t + 0.14, 0.004, 0.01, 0.26, 0.38); // E5
  },

  /** Login success — bright G major pentatonic fanfare */
  loginSuccess() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.92);
    const rev = reverbBus(ac, out, 0.58);
    const t = ac.currentTime;
    tone(ac, rev, 392,  t,         0.006, 0.02, 0.42, 0.55); // G4
    tone(ac, rev, 494,  t + 0.07,  0.005, 0.02, 0.40, 0.52); // B4
    tone(ac, rev, 587,  t + 0.14,  0.005, 0.02, 0.38, 0.55); // D5
    tone(ac, rev, 784,  t + 0.22,  0.005, 0.02, 0.52, 0.62); // G5
    tone(ac, rev, 988,  t + 0.30,  0.004, 0.015, 0.48, 0.52); // B5
    tone(ac, rev, 1175, t + 0.38,  0.004, 0.01, 0.58, 0.48); // D6
    // Gold crown sparkle chord
    chord(ac, rev, [1568, 1976, 2349], t + 0.48, 0.003, 0.005, 0.60, 0.32); // G6 B6 D7
  },

  /** Error — warm minor descend, never harsh */
  error() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.82);
    const rev = reverbBus(ac, out, 0.38);
    const t = ac.currentTime;
    tone(ac, rev, 494,  t,        0.005, 0.02, 0.30, 0.52); // B4
    tone(ac, rev, 415,  t + 0.10, 0.005, 0.02, 0.34, 0.48); // G#4 — minor colour
    tone(ac, rev, 370,  t + 0.22, 0.006, 0.02, 0.38, 0.45); // F#4
  },

  /** Destroy / delete — deep low thud + subtle reverb */
  destroy() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.82);
    const rev = reverbBus(ac, out, 0.32);
    const t = ac.currentTime;
    tone(ac, rev, 196, t,        0.010, 0.025, 0.32, 0.62); // G3
    tone(ac, rev, 147, t + 0.08, 0.008, 0.015, 0.38, 0.48); // D3
    tone(ac, rev, 98,  t + 0.18, 0.012, 0.02, 0.42, 0.35); // G2 — sub body
  },

  /** Notification — crystal bell triad, rich and clear */
  notify() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.88);
    const rev = reverbBus(ac, out, 0.62);
    const t = ac.currentTime;
    tone(ac, rev, 1047, t,        0.003, 0.01, 0.60, 0.55); // C6
    tone(ac, rev, 1319, t + 0.05, 0.003, 0.01, 0.58, 0.50); // E6
    tone(ac, rev, 1568, t + 0.10, 0.003, 0.008, 0.58, 0.48); // G6
    tone(ac, rev, 2093, t + 0.18, 0.002, 0.005, 0.55, 0.30); // C7 shimmer
  },

  /** App boot / splash — cinematic ambient swell */
  boot() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.92);
    const rev = reverbBus(ac, out, 0.68);
    const t = ac.currentTime;
    tone(ac, rev, 65,  t,         0.22, 0.32, 0.85, 0.42); // C2
    tone(ac, rev, 130, t + 0.10,  0.16, 0.22, 0.72, 0.32); // C3
    tone(ac, rev, 262, t + 0.22,  0.18, 0.26, 0.82, 0.36); // C4
    tone(ac, rev, 330, t + 0.30,  0.16, 0.23, 0.78, 0.33); // E4
    tone(ac, rev, 392, t + 0.38,  0.14, 0.21, 0.72, 0.31); // G4
    tone(ac, rev, 494, t + 0.46,  0.12, 0.19, 0.68, 0.29); // B4
    tone(ac, rev, 1047, t + 0.58, 0.008, 0.01, 0.62, 0.40); // C6
    tone(ac, rev, 1319, t + 0.68, 0.006, 0.01, 0.57, 0.30); // E6
    tone(ac, rev, 1568, t + 0.78, 0.004, 0.008, 0.55, 0.20); // G6 — final glimmer
  },

  /** Scan / register — warm two-note acceptance */
  scan() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.82);
    const rev = reverbBus(ac, out, 0.46);
    const t = ac.currentTime;
    tone(ac, rev, 659,  t,        0.004, 0.018, 0.30, 0.54); // E5
    tone(ac, rev, 784,  t + 0.10, 0.004, 0.015, 0.32, 0.48); // G5
    tone(ac, rev, 1047, t + 0.20, 0.003, 0.01, 0.28, 0.32); // C6 — shimmer
  },

  /** Purchase / sale — premium cash register with gold chord */
  purchase() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.90);
    const rev = reverbBus(ac, out, 0.50);
    const t = ac.currentTime;
    // Bright clink
    tone(ac, rev, 2637, t,        0.002, 0.004, 0.12, 0.60); // E7 — clink
    tone(ac, rev, 2093, t + 0.03, 0.002, 0.005, 0.10, 0.45); // C7
    // Rich Amaj chord body
    tone(ac, rev, 440,  t + 0.05, 0.006, 0.02, 0.42, 0.52); // A4
    tone(ac, rev, 554,  t + 0.10, 0.005, 0.02, 0.40, 0.48); // C#5
    tone(ac, rev, 659,  t + 0.15, 0.005, 0.02, 0.38, 0.50); // E5
    tone(ac, rev, 880,  t + 0.22, 0.004, 0.015, 0.50, 0.45); // A5 — crown
  },

  /** Success / tick — crisp satisfying confirm */
  success() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.88);
    const rev = reverbBus(ac, out, 0.48);
    const t = ac.currentTime;
    tone(ac, rev, 784,  t,        0.003, 0.015, 0.28, 0.55); // G5
    tone(ac, rev, 1047, t + 0.08, 0.003, 0.012, 0.32, 0.60); // C6
    tone(ac, rev, 1319, t + 0.15, 0.002, 0.008, 0.28, 0.50); // E6
  },

  /** Warning / caution — amber two-tone alert */
  warning() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.80);
    const rev = reverbBus(ac, out, 0.35);
    const t = ac.currentTime;
    tone(ac, rev, 554,  t,        0.005, 0.04, 0.18, 0.55, "triangle"); // C#5 — amber pulse
    tone(ac, rev, 440,  t + 0.18, 0.005, 0.04, 0.22, 0.52, "triangle"); // A4
    tone(ac, rev, 554,  t + 0.38, 0.004, 0.03, 0.20, 0.48, "triangle"); // C#5 echo
  },

  /** Swipe / drag — soft whoosh */
  swipe() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.65);
    const rev = reverbBus(ac, out, 0.38);
    const t = ac.currentTime;
    // Rising then falling noise-like via quick frequency sweep
    const env = ac.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    env.connect(out);
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.22);
    o.connect(env);
    o.start(t); o.stop(t + 0.25);
  },

  /** Long press / hold confirm — rising swell resolve */
  longPress() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.82);
    const rev = reverbBus(ac, out, 0.50);
    const t = ac.currentTime;
    tone(ac, rev, 392,  t,        0.012, 0.03, 0.28, 0.45); // G4
    tone(ac, rev, 523,  t + 0.12, 0.010, 0.025, 0.30, 0.48); // C5
    tone(ac, rev, 659,  t + 0.25, 0.008, 0.02, 0.32, 0.52); // E5
    tone(ac, rev, 784,  t + 0.38, 0.006, 0.015, 0.42, 0.58); // G5 — resolve
  },

  /** Unlock / access granted — bright crystal unlock */
  unlock() {
    const ac = getCtx(); if (!ac) return;
    const out = bus(ac, 0.88);
    const rev = reverbBus(ac, out, 0.56);
    const t = ac.currentTime;
    // Mechanical lock click
    tone(ac, rev, 2637, t,        0.001, 0.003, 0.08, 0.70); // E7 snap
    tone(ac, rev, 1760, t + 0.05, 0.002, 0.005, 0.10, 0.55); // A6
    // Open chord swell
    tone(ac, rev, 523,  t + 0.12, 0.008, 0.02, 0.38, 0.50); // C5
    tone(ac, rev, 659,  t + 0.18, 0.006, 0.018, 0.35, 0.52); // E5
    tone(ac, rev, 784,  t + 0.24, 0.005, 0.015, 0.40, 0.48); // G5
    tone(ac, rev, 1047, t + 0.32, 0.004, 0.01, 0.50, 0.42); // C6 — open!
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

/**
 * Plays a multi-layered cinematic ambient track during the splash screen.
 * Returns a stop() function that fades out and disconnects all nodes.
 *
 * Layers:
 *  1. Sub drone (C1 + C2) — slow beating LFO for depth
 *  2. Pad swell — Cmaj9 chord arpeggiated slowly
 *  3. High shimmer — bell overtone pings at random intervals
 *  4. Rhythmic pulse — soft kick-like thud every ~0.9s
 */
export function playSplashMusic(): () => void {
  const _ac = getCtx();
  if (!_ac) return () => {};
  const ac: AudioContext = _ac;

  // Mutable stop reference so the returned closure can cancel even before async starts
  let masterNode: GainNode | null = null;
  let stopped = false;

  const stopFn = () => {
    stopped = true;
    if (!masterNode) return;
    try {
      const now = ac.currentTime;
      masterNode.gain.cancelScheduledValues(now);
      masterNode.gain.setValueAtTime(masterNode.gain.value, now);
      masterNode.gain.linearRampToValueAtTime(0, now + 0.45);
    } catch {/* ignore */}
  };

  // Resume AudioContext (may be suspended on first load) then schedule music
  const startMusic = async () => {
    if (ac.state === "suspended") {
      try { await ac.resume(); } catch {/* ignore */}
    }
    if (stopped) return;
    const t = ac.currentTime;

  // Master bus with envelope for fade-in / fade-out
  const master = ac.createGain();
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(0.32, t + 0.6);
  master.connect(ac.destination);

  const rev = makeReverb(ac, 2.8, 2.5);
  const revGain = ac.createGain();
  revGain.gain.value = 0.55;
  rev.connect(revGain);
  revGain.connect(master);

  const dry = ac.createGain();
  dry.gain.value = 0.45;
  dry.connect(master);

  const allNodes: AudioNode[] = [master, revGain, dry];

  function addOsc(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine") {
    const g = ac.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.25);
    g.gain.setValueAtTime(vol, start + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, start + dur);
    g.connect(dry);
    g.connect(rev);
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    o.start(start);
    o.stop(start + dur + 0.05);
    allNodes.push(g, o);
  }

  // ── Layer 1: Sub drone — slowly pulsing C2 ────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const st = t + i * 0.7;
    addOsc(65.4,  st, 1.4, 0.28 + (i % 2) * 0.06); // C2
    addOsc(130.8, st + 0.1, 1.2, 0.12);              // C3 overtone
  }

  // ── Layer 2: Pad chord swell — Cmaj9 ─────────────────────────────────────
  // C3 E3 G3 B3 D4 — rich warm pad
  const padFreqs = [130.8, 164.8, 196.0, 246.9, 293.7];
  padFreqs.forEach((f, i) => {
    addOsc(f, t + 0.15 + i * 0.12, 3.4, 0.18 - i * 0.018);
    // Second wave slightly detuned for chorus effect
    addOsc(f * 1.004, t + 0.18 + i * 0.12, 3.2, 0.10 - i * 0.01);
  });

  // ── Layer 3: High sparkle bells — delayed pings ────────────────────────────
  const bellFreqs = [1046.5, 1318.5, 1568.0, 2093.0]; // C6 E6 G6 C7
  bellFreqs.forEach((f, i) => {
    const st = t + 0.6 + i * 0.18;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(0.10 - i * 0.015, st + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 1.2);
    g.connect(rev);
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(g);
    o.start(st);
    o.stop(st + 1.3);
    allNodes.push(g, o);
  });

  // Second bell cluster at 1.8s
  [1318.5, 1568.0, 2093.0].forEach((f, i) => {
    const st = t + 1.8 + i * 0.15;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(0.08, st + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 1.0);
    g.connect(rev);
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(g);
    o.start(st);
    o.stop(st + 1.1);
    allNodes.push(g, o);
  });

  // ── Layer 4: Soft kick pulse every ~0.88s ─────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const st = t + 0.44 + i * 0.88;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.22, st);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 0.28);
    g.connect(dry);
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, st);
    o.frequency.exponentialRampToValueAtTime(40, st + 0.18);
    o.connect(g);
    o.start(st);
    o.stop(st + 0.3);
    allNodes.push(g, o);
  }

  // ── Rising outro — ascending arpeggio at ~3s ──────────────────────────────
  [261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1046.5].forEach((f, i) => {
    const st = t + 3.0 + i * 0.09;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(0.15 - i * 0.012, st + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 0.5 + i * 0.05);
    g.connect(rev);
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(g);
    o.start(st);
    o.stop(st + 0.7);
    allNodes.push(g, o);
  });

    masterNode = master;
  }; // end startMusic

  startMusic();
  return stopFn;
}
