"use client";

/**
 * useSFX — Synthetic sound effects via Web Audio API.
 * Zero dependencies, zero audio files. All sounds generated programmatically.
 * Respects OS "prefers-reduced-motion" (also disables sound).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; }
  }
  // Resume on user gesture
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function master(ac: AudioContext): GainNode {
  const g = ac.createGain();
  // Global volume — subtle, not jarring
  g.gain.value = 0.18;
  g.connect(ac.destination);
  return g;
}

// ── Primitive builders ────────────────────────────────────────────────────────

function osc(
  ac: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  gainStart = 0.8,
  gainEnd = 0.0,
) {
  const env = ac.createGain();
  env.gain.setValueAtTime(gainStart, startTime);
  env.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), startTime + duration);
  env.connect(out);

  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, startTime);
  o.connect(env);
  o.start(startTime);
  o.stop(startTime + duration + 0.01);
}

function noise(ac: AudioContext, out: AudioNode, startTime: number, duration: number, gain = 0.3) {
  const bufSize = ac.sampleRate * duration;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;

  const env = ac.createGain();
  env.gain.setValueAtTime(gain, startTime);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  src.connect(env);
  env.connect(out);
  src.start(startTime);
}

// ── Sound library ─────────────────────────────────────────────────────────────

const SFX = {
  /** Light tap — nav links, any generic button press */
  tap() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 880, t, 0.08, 0.5, 0);
    osc(ac, out, "sine", 660, t + 0.02, 0.06, 0.3, 0);
  },

  /** Softer tap — secondary actions, toggles */
  softTap() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 700, t, 0.07, 0.35, 0);
  },

  /** Page navigation — slightly rising tone */
  navigate() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 520, t,        0.10, 0.4, 0);
    osc(ac, out, "sine", 780, t + 0.06, 0.10, 0.5, 0);
  },

  /** Success — bright two-note chord */
  success() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 880,  t,        0.18, 0.12, 0.5);
    osc(ac, out, "sine", 1320, t + 0.08, 0.20, 0.55, 0.12);
    osc(ac, out, "sine", 1760, t + 0.18, 0.14, 0.40, 0);
  },

  /** Error — low descending tone */
  error() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sawtooth", 280, t,        0.12, 0.4, 0.05);
    osc(ac, out, "sawtooth", 200, t + 0.12, 0.10, 0.35, 0);
  },

  /** Modal open — soft pop */
  modalOpen() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 440, t,        0.06, 0.4, 0.05);
    osc(ac, out, "sine", 660, t + 0.05, 0.09, 0.5, 0);
  },

  /** Modal close — reverse pop */
  modalClose() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 600, t,        0.08, 0.4, 0);
    osc(ac, out, "sine", 400, t + 0.04, 0.06, 0.3, 0);
  },

  /** Notification / badge pulse */
  notify() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 1046, t,        0.12, 0.5, 0);
    osc(ac, out, "sine", 1318, t + 0.10, 0.10, 0.4, 0);
  },

  /** App launch / splash boot — cinematic sweep */
  boot() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    // Low rumble
    osc(ac, out, "sine", 60,  t,        0.35, 0.55, 0);
    osc(ac, out, "sine", 120, t + 0.15, 0.18, 0.40, 0);
    // Mid rise
    osc(ac, out, "sine", 330, t + 0.20, 0.22, 0.50, 0.10);
    osc(ac, out, "sine", 660, t + 0.35, 0.25, 0.55, 0.08);
    // High sparkle
    osc(ac, out, "sine", 1320, t + 0.50, 0.16, 0.42, 0);
    osc(ac, out, "sine", 2200, t + 0.60, 0.10, 0.30, 0);
    // Noise layer — texture
    noise(ac, out, t, 0.12, 0.08);
  },

  /** Login submit (loading start) — short ascending chime */
  loginSubmit() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 440, t,        0.10, 0.45, 0.05);
    osc(ac, out, "sine", 550, t + 0.07, 0.08, 0.40, 0);
  },

  /** Login success — warm landing */
  loginSuccess() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 660,  t,        0.20, 0.50, 0.10);
    osc(ac, out, "sine", 880,  t + 0.10, 0.22, 0.55, 0.10);
    osc(ac, out, "sine", 1320, t + 0.22, 0.15, 0.45, 0);
  },

  /** Delete / destructive — negative low thud */
  destroy() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sawtooth", 160, t,        0.18, 0.45, 0);
    osc(ac, out, "sawtooth", 100, t + 0.08, 0.14, 0.38, 0);
    noise(ac, out, t, 0.10, 0.06);
  },

  /** Save / confirm — clean single tick */
  save() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "sine", 1046, t,        0.14, 0.5, 0);
    osc(ac, out, "sine", 784,  t + 0.08, 0.10, 0.3, 0);
  },

  /** Scan / QR detected */
  scan() {
    const ac = getCtx(); if (!ac) return;
    const out = master(ac);
    const t = ac.currentTime;
    osc(ac, out, "square", 1200, t,        0.10, 0.4, 0);
    osc(ac, out, "square", 1600, t + 0.06, 0.08, 0.3, 0);
  },
};

export type SFXName = keyof typeof SFX;

export function playSound(name: SFXName) {
  // Respect reduced-motion preference (also silences SFX)
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try { SFX[name](); } catch { /* silently ignore AudioContext errors */ }
}

/** React hook for easy access inside components */
export function useSFX() {
  return playSound;
}
