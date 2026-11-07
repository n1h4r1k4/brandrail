"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Headphones, Volume2, VolumeX } from "lucide-react";
import { useSound } from "./sound";
import { LogoMark } from "./ui";

/** First-visit gate: choose to enter with or without sound. Remembered for this browser session. */
export function IntroGate() {
  const { setEnabled, play } = useSound();
  const [phase, setPhase] = useState<"open" | "leaving" | "gone">("open");

  useEffect(() => {
    document.documentElement.style.overflow = phase === "gone" ? "" : "hidden";
    return () => { document.documentElement.style.overflow = ""; };
  }, [phase]);

  if (phase === "gone") return null;

  const enter = (withSound: boolean) => {
    setEnabled(withSound);
    if (withSound) window.setTimeout(() => play("enter"), 60);
    document.cookie = "br_gate=1; path=/; max-age=21600; samesite=lax";
    setPhase("leaving");
    window.setTimeout(() => setPhase("gone"), 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enter Brandrail"
      className={clsx(
        "fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#07061a] px-6 py-14 transition-all duration-700",
        phase === "leaving" && "pointer-events-none scale-105 opacity-0 blur-sm",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_380px_at_50%_42%,rgba(129,140,248,0.28),transparent_70%),radial-gradient(500px_300px_at_50%_100%,rgba(45,212,191,0.14),transparent_70%)]" />
      <div className="relative font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">We Code Coders · Inkloom AI problem statement</div>

      <div className="relative flex flex-col items-center text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-indigo-400/20 [animation-duration:2.4s]" />
          <LogoMark size={56} />
        </div>
        <div className="mt-6 font-serif text-6xl tracking-tight text-white sm:text-7xl">
          Brand<span className="italic text-indigo-300">rail</span>
        </div>
        <p className="mt-4 max-w-md font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-slate-400">
          Pre-publication brand governance<br />Guardrails, not gatekeepers
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-4">
        <button
          autoFocus
          onClick={() => enter(true)}
          className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-indigo-300/40 bg-indigo-500/15 px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_0_40px_-8px_rgba(129,140,248,0.7)] backdrop-blur transition hover:bg-indigo-500/25"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition duration-700 group-hover:translate-x-full" />
          <Volume2 size={18} className="text-indigo-200" /> Enter with sound
        </button>
        <button onClick={() => enter(false)} className="inline-flex items-center gap-2 border-b border-slate-600 pb-0.5 text-sm text-slate-300 transition hover:border-white hover:text-white">
          <VolumeX size={15} /> Enter without sound
        </button>
        <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">
          <Headphones size={12} /> Sound is generated live in your browser
        </span>
      </div>
    </div>
  );
}
