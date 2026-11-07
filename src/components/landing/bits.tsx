"use client";
// Small interaction pieces for the landing page: smooth scrolling, line reveals,
// scroll-filled text, the settings menu and the guide.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MessageCircleQuestion, Settings, X } from "lucide-react";
import { LogoMark } from "@/components/ui";
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
export function ScrollFillText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
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
    <p ref={ref} className={className} style={style}>
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
      <span className={clsx("relative h-4 w-7 rounded-full transition", on ? "bg-teal-400" : "bg-white/25")}>
        <span className={clsx("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", on ? "left-3.5" : "left-0.5")} />
      </span>
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-current/10">
        <Settings size={17} strokeWidth={1.6} />
      </button>
      {open && (
        <div className="fade-up absolute right-0 top-11 z-40 w-56 rounded-2xl border border-white/15 bg-[#11163a]/95 p-1.5 text-sm text-white shadow-2xl backdrop-blur-xl">
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
        <div className="fade-up w-80 rounded-3xl border border-white/15 bg-[#11163a]/95 p-4 text-sm text-slate-200 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-white"><LogoMark size={20} /> Ask Brandrail</span>
            <button onClick={() => setOpen(false)} aria-label="Close guide"><X size={15} /></button>
          </div>
          <p className="mt-2 text-slate-300">{answer === null ? "Hi! Ask me anything about the demo." : FAQ[answer][1]}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FAQ.map(([q], i) => (
              <button key={q} onClick={() => { setAnswer(i); play("tick"); }} className={clsx("rounded-full border px-2.5 py-1 text-xs transition", answer === i ? "border-teal-300 bg-teal-400/20 text-white" : "border-white/15 hover:bg-white/10")}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => { setOpen(!open); setBubble(false); play("tick"); }}
        aria-label="Open the Brandrail guide"
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#11163a]/90 py-1.5 pl-1.5 pr-4 text-sm text-white shadow-[0_12px_30px_-10px_rgba(18,23,53,0.7)] backdrop-blur transition hover:bg-[#1b2150]"
      >
        <LogoMark size={28} />
        <span className="hidden sm:inline">{bubble ? "Ask how to test the demo" : "Ask Brandrail"}</span>
        <MessageCircleQuestion size={16} className="sm:hidden" />
      </button>
    </div>
  );
}
