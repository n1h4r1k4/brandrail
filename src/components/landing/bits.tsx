"use client";
// Small interaction pieces for the landing page: smooth scrolling, line reveals,
// scroll-filled text, the settings menu, the guide orb and the rotating 3D badge.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Settings, Sparkles, X } from "lucide-react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSound } from "@/components/sound";
import type { Quality, Theme } from "./world";

// ------------------------------------------------------------- settings context
interface LandingSettings { theme: Theme; quality: Quality; setTheme: (t: Theme) => void; setQuality: (q: Quality) => void }
const Ctx = createContext<LandingSettings>({ theme: "day", quality: "high", setTheme: () => {}, setQuality: () => {} });
export const useLanding = () => useContext(Ctx);

export function LandingSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeS] = useState<Theme>("day");
  const [quality, setQualityS] = useState<Quality>("high");
  useEffect(() => {
    try {
      const t = localStorage.getItem("br_theme");
      const q = localStorage.getItem("br_quality");
      if (t === "day" || t === "night") setThemeS(t);
      if (q === "high" || q === "low") setQualityS(q);
      else if ((navigator.hardwareConcurrency ?? 8) <= 4) setQualityS("low");
    } catch {}
  }, []);
  const setTheme = (t: Theme) => { setThemeS(t); try { localStorage.setItem("br_theme", t); } catch {} };
  const setQuality = (q: Quality) => { setQualityS(q); try { localStorage.setItem("br_quality", q); } catch {} };
  return <Ctx.Provider value={{ theme, quality, setTheme, setQuality }}>{children}</Ctx.Provider>;
}

// ------------------------------------------------------------- smooth scroll
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const l = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, anchors: { offset: -10 } });
      lenis = l;
      const loop = (t: number) => { l.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); lenis?.destroy(); };
  }, []);
  return null;
}

// ------------------------------------------------------------- reveal on scroll
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "span" }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={clsx("block overflow-hidden", className)}>
      <span
        className="block transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(.2,.7,.1,1)]"
        style={{ transform: shown ? "none" : "translateY(105%)", opacity: shown ? 1 : 0, transitionDelay: `${delay}ms` }}
      >
        {children}
      </span>
    </Tag>
  );
}

// ------------------------------------------------------------- text that fills word by word as you scroll
export function ScrollFillText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [k, setK] = useState(0);
  const words = text.split(" ");
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const start = window.innerHeight * 0.85, end = window.innerHeight * 0.25;
      const prog = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * 0.5)));
      setK(Math.round(prog * words.length));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [words.length]);
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} className="transition-colors duration-300" style={{ color: i < k ? "var(--l-ink)" : "var(--l-faint)" }}>{w} </span>
      ))}
    </p>
  );
}

// ------------------------------------------------------------- settings dropdown (sound, dark mode, quality)
export function SettingsMenu() {
  const { theme, setTheme, quality, setQuality } = useLanding();
  const { enabled, setEnabled, play } = useSound();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const Row = ({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) => (
    <button onClick={() => { onClick(); play("tick"); }} className="flex w-full items-center justify-between gap-6 rounded-lg px-3 py-2 text-left hover:bg-white/10">
      <span>{label}</span>
      <span className={clsx("relative h-4 w-7 rounded-full transition", on ? "bg-violet-500" : "bg-white/25")}>
        <span className={clsx("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", on ? "left-3.5" : "left-0.5")} />
      </span>
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] hover:opacity-80">
        <Settings size={14} /> Settings
      </button>
      {open && (
        <div className="fade-up absolute left-1/2 top-8 z-40 w-56 -translate-x-1/2 rounded-2xl border border-white/15 bg-[#1b1240]/85 p-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white shadow-2xl backdrop-blur-xl">
          <Row label="Sound" on={enabled} onClick={() => setEnabled(!enabled)} />
          <Row label="Dark mode" on={theme === "night"} onClick={() => setTheme(theme === "night" ? "day" : "night")} />
          <Row label="High quality" on={quality === "high"} onClick={() => setQuality(quality === "high" ? "low" : "high")} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------- guide orb
const FAQ: [string, string][] = [
  ["How do I test it?", "Open the live demo, go to New content and load the “Diwali cashback post” sample. Accept a fix, dispute one, submit, then switch persona (top right) to the brand reviewer and Compliance to approve."],
  ["What does the verifier do?", "Every AI finding must quote the exact text and cite a rule or approved fact. Anything that can't be traced is dropped, and suggested rewrites are re-checked before you see them."],
  ["Is my data safe?", "Confidential terms and personal data are masked before any text reaches the AI. OCR and colour checks run in your browser. Demo data is fictional."],
  ["What's it built with?", "Next.js, Postgres, a deterministic rule engine, Gemini's free tier for the AI review, three.js for this world, and sound generated live with the Web Audio API."],
];

export function GuideOrb() {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(true);
  const [answer, setAnswer] = useState<number | null>(null);
  const { play } = useSound();
  useEffect(() => { const t = setTimeout(() => setBubble(false), 9000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="fade-up w-80 rounded-3xl border border-white/20 bg-[#1b1240]/90 p-4 text-sm text-slate-200 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300">Brandrail guide</span>
            <button onClick={() => setOpen(false)} aria-label="Close guide"><X size={15} /></button>
          </div>
          <p className="mt-2 text-slate-300">{answer === null ? "Hi! Ask me anything about the demo." : FAQ[answer][1]}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FAQ.map(([q], i) => (
              <button key={q} onClick={() => { setAnswer(i); play("tick"); }} className={clsx("rounded-full border px-2.5 py-1 text-xs transition", answer === i ? "border-violet-400 bg-violet-500/30 text-white" : "border-white/15 hover:bg-white/10")}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      {bubble && !open && (
        <div className="fade-up hidden max-w-[240px] rounded-2xl bg-gradient-to-r sm:block from-violet-500 to-fuchsia-500 px-3.5 py-2.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-white shadow-xl">
          Hi! I&apos;m the Brandrail guide. Ask me how to test the demo.
        </div>
      )}
      <button
        onClick={() => { setOpen(!open); setBubble(false); play("tick"); }}
        aria-label="Open the Brandrail guide"
        className="group relative h-14 w-14 rounded-full shadow-[0_8px_30px_-6px_rgba(168,85,247,0.7)] transition hover:scale-105"
        style={{ background: "radial-gradient(circle at 32% 28%, #ffffff 0%, #f5d0fe 18%, #c084fc 45%, #7c3aed 75%, #4c1d95 100%)" }}
      >
        <span className="absolute inset-1 animate-[spin-slow_9s_linear_infinite] rounded-full opacity-70" style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,.75) 40deg, transparent 90deg, transparent 220deg, rgba(240,171,252,.7) 270deg, transparent 320deg)" }} />
        <Sparkles size={16} className="absolute inset-0 m-auto text-white/90" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------- rotating 3D badge (Brandrail mark)
export function Badge3D({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // soft studio reflections so the glossy shield reads as lavender glass, not a black slab
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    const cam = new THREE.PerspectiveCamera(35, el.clientWidth / el.clientHeight, 0.1, 50);
    cam.position.set(0, 0, 9);
    scene.add(new THREE.HemisphereLight("#ffffff", "#c4b5fd", 1.2));
    const d = new THREE.DirectionalLight("#ffffff", 1.6);
    d.position.set(3, 4, 5);
    scene.add(d);
    const shield = new THREE.Shape();
    shield.moveTo(0, 1.6);
    shield.lineTo(1.25, 1.1);
    shield.lineTo(1.25, 0.1);
    shield.bezierCurveTo(1.25, -0.9, 0.5, -1.45, 0, -1.7);
    shield.bezierCurveTo(-0.5, -1.45, -1.25, -0.9, -1.25, 0.1);
    shield.lineTo(-1.25, 1.1);
    shield.closePath();
    const geo = new THREE.ExtrudeGeometry(shield, { depth: 0.5, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 5 });
    geo.center();
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: "#d9ccff", roughness: 0.18, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08,
      iridescence: 0.9, iridescenceIOR: 1.4, iridescenceThicknessRange: [180, 520], sheen: 0.6, sheenColor: new THREE.Color("#f0abfc"),
    });
    const body = new THREE.Mesh(geo, bodyMat);
    const check = new THREE.Shape();
    check.moveTo(-0.62, 0.05); check.lineTo(-0.22, -0.38); check.lineTo(0.66, 0.55); check.lineTo(0.48, 0.72);
    check.lineTo(-0.22, -0.02); check.lineTo(-0.44, 0.24); check.closePath();
    const cGeo = new THREE.ExtrudeGeometry(check, { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    const markMat = new THREE.MeshStandardMaterial({ color: "#7c3aed", emissive: "#6d28d9", emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 });
    const mark = new THREE.Mesh(cGeo, markMat);
    mark.position.z = 0.3;
    const back = new THREE.Mesh(cGeo, markMat); // same mark on the back face, mirrored
    back.rotation.y = Math.PI;
    back.position.z = -0.3;
    const group = new THREE.Group();
    group.add(body, mark, back);
    scene.add(group);
    let mx = 0, my = 0;
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove);
    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.6 + mx * 0.8;
      group.rotation.x = Math.sin(t * 0.7) * 0.15 + my * 0.5;
      group.rotation.z = -0.25;
      renderer.render(scene, cam);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      geo.dispose(); cGeo.dispose(); bodyMat.dispose(); markMat.dispose(); env.dispose(); pmrem.dispose(); room.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={host} className={className} aria-hidden="true" />;
}
