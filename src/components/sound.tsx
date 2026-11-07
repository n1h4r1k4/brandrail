"use client";
// Generative sound for Brandrail, synthesised live with the Web Audio API (no audio files).
// - an ambient pad (detuned oscillators, slow filter movement, generated reverb) for the landing page
// - short UI cues (success, verified, error, tick) for actions in the app
// Sound is off until the visitor opts in; the choice is remembered on this device.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type Cue = "tick" | "success" | "verified" | "error" | "enter";

interface SoundApi {
  enabled: boolean;
  setEnabled: (on: boolean) => void; // call from a user gesture
  toggle: () => void;
  play: (cue: Cue) => void;
  setAmbient: (on: boolean) => void;
  analyser: () => AnalyserNode | null;
}

const SoundContext = createContext<SoundApi | null>(null);
const KEY = "br_sound";

function makeImpulse(ctx: AudioContext, seconds = 3.2, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

class Engine {
  ctx: AudioContext;
  master: GainNode;
  verb: ConvolverNode;
  wet: GainNode;
  analyser: AnalyserNode;
  pad: { stop: () => void } | null = null;

  constructor() {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;
    this.verb = this.ctx.createConvolver();
    this.verb.buffer = makeImpulse(this.ctx);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.5;
    this.verb.connect(this.wet).connect(this.master);
    this.master.connect(this.analyser).connect(this.ctx.destination);
  }

  setOn(on: boolean) {
    const t = this.ctx.currentTime;
    if (on && this.ctx.state === "suspended") void this.ctx.resume();
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.55 : 0, t, on ? 0.4 : 0.15);
  }

  /** Dry + reverb send for a source. */
  out(node: AudioNode, send = 0.6) {
    const dry = this.ctx.createGain();
    dry.gain.value = 1 - send * 0.5;
    const s = this.ctx.createGain();
    s.gain.value = send;
    node.connect(dry).connect(this.master);
    node.connect(s).connect(this.verb);
  }

  note(freq: number, at: number, dur: number, type: OscillatorType = "triangle", vol = 0.18, send = 0.6) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    this.out(g, send);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  cue(c: Cue) {
    const t = this.ctx.currentTime + 0.01;
    if (c === "tick") this.note(1320, t, 0.08, "sine", 0.06, 0.2);
    if (c === "success") { this.note(659.25, t, 0.5); this.note(987.77, t + 0.09, 0.7); }
    if (c === "verified") [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.note(f, t + i * 0.09, 1.1, "triangle", 0.16));
    if (c === "enter") [392, 587.33, 783.99].forEach((f, i) => this.note(f, t + i * 0.12, 1.6, "sine", 0.14, 0.8));
    if (c === "error") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.25);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g);
      this.out(g, 0.3);
      o.start(t);
      o.stop(t + 0.35);
    }
  }

  /** Slow ambient pad: two alternating chords, gently filtered, through the reverb. */
  startPad() {
    if (this.pad) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(0.16, t + 4);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 420;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    filter.connect(bus);
    this.out(bus, 0.85);

    const chords = [
      [110, 164.81, 196, 246.94, 329.63], // A minor 9 voicing
      [87.31, 130.81, 174.61, 220, 329.63], // F major 7 voicing
      [98, 146.83, 196, 246.94, 293.66], // G6 voicing
    ];
    const voices = chords[0].map((f, i) => {
      const a = ctx.createOscillator();
      const b = ctx.createOscillator();
      a.type = "sine";
      b.type = "triangle";
      a.frequency.value = f;
      b.frequency.value = f;
      b.detune.value = i % 2 ? 7 : -7;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.28;
      a.connect(g);
      b.connect(g);
      g.connect(filter);
      a.start();
      b.start();
      return { a, b };
    });
    // Noise "air" layer.
    const noise = ctx.createBufferSource();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    noise.buffer = nb;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.value = 0.025;
    noise.connect(bp).connect(ng).connect(bus);
    noise.start();

    let step = 0;
    const timer = window.setInterval(() => {
      step = (step + 1) % chords.length;
      const now = ctx.currentTime;
      voices.forEach((v, i) => {
        v.a.frequency.setTargetAtTime(chords[step][i], now, 1.6);
        v.b.frequency.setTargetAtTime(chords[step][i], now, 1.6);
      });
    }, 9000);

    this.pad = {
      stop: () => {
        const now = ctx.currentTime;
        bus.gain.cancelScheduledValues(now);
        bus.gain.setTargetAtTime(0, now, 0.6);
        window.clearInterval(timer);
        window.setTimeout(() => {
          voices.forEach((v) => { v.a.stop(); v.b.stop(); });
          noise.stop();
          lfo.stop();
        }, 3000);
        this.pad = null;
      },
    };
  }

  stopPad() {
    this.pad?.stop();
  }
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const engine = useRef<Engine | null>(null);
  const ambientWanted = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "on") setEnabledState(true);
    } catch {}
  }, []);

  const ensure = useCallback(() => {
    if (!engine.current && typeof window !== "undefined") {
      try {
        engine.current = new Engine();
      } catch {
        return null;
      }
    }
    return engine.current;
  }, []);

  // Browsers only allow audio after a user gesture: start on the first interaction if sound is on.
  useEffect(() => {
    if (!enabled) return;
    const start = () => {
      const e = ensure();
      if (!e) return;
      e.setOn(true);
      if (ambientWanted.current) e.startPad();
    };
    if (engine.current) start();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [enabled, ensure]);

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
    const e = on ? ensure() : engine.current;
    if (!e) return;
    e.setOn(on);
    if (on && ambientWanted.current) e.startPad();
    if (!on) e.stopPad();
  }, [ensure]);

  const api = useMemo<SoundApi>(() => ({
    enabled,
    setEnabled,
    toggle: () => setEnabled(!enabled),
    play: (cue) => {
      if (!enabled) return;
      const e = ensure();
      if (!e) return;
      e.setOn(true);
      e.cue(cue);
    },
    setAmbient: (on) => {
      ambientWanted.current = on;
      const e = engine.current;
      if (!e) return;
      if (on && enabled) e.startPad();
      else e.stopPad();
    },
    analyser: () => engine.current?.analyser ?? null,
  }), [enabled, setEnabled, ensure]);

  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    const noop = () => {};
    return { enabled: false, setEnabled: noop, toggle: noop, play: noop, setAmbient: noop, analyser: () => null };
  }
  return ctx;
}

/** Turns the ambient pad on while the calling component is mounted. */
export function AmbientWhileMounted() {
  const { setAmbient, enabled } = useSound();
  useEffect(() => {
    setAmbient(true);
    return () => setAmbient(false);
  }, [setAmbient, enabled]);
  return null;
}

/** Equaliser-style sound toggle; bars follow the live audio when sound is on. */
export function SoundToggle({ dark = false, className }: { dark?: boolean; className?: string }) {
  const { enabled, toggle, analyser } = useSound();
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const data = new Uint8Array(32);
    const tick = (t: number) => {
      const a = analyser();
      if (a) a.getByteFrequencyData(data);
      bars.current.forEach((el, i) => {
        if (!el) return;
        let h = 0.18;
        if (enabled) {
          const live = a ? data[2 + i * 3] / 255 : 0;
          h = Math.max(0.2, Math.min(1, live * 1.4 + 0.25 + 0.15 * Math.sin(t / 260 + i * 1.3)));
        }
        el.style.transform = `scaleY(${h})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, analyser]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      title={enabled ? "Sound on" : "Sound off"}
      className={clsx(
        "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition",
        dark ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-muted hover:bg-soft hover:text-ink",
        className,
      )}
    >
      <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            ref={(el) => { bars.current[i] = el; }}
            className={clsx("h-full w-[2px] origin-bottom rounded-full transition-transform duration-100", enabled ? (dark ? "bg-indigo-300" : "bg-accent") : dark ? "bg-slate-500" : "bg-slate-400")}
            style={{ transform: "scaleY(0.18)" }}
          />
        ))}
      </span>
      <span className="hidden sm:inline">{enabled ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
