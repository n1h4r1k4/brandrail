"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "./sound";

/** Loader, then the choice to enter with or without sound. Remembered for the browser session. */
export function IntroGate() {
  const { setEnabled, play } = useSound();
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<"loading" | "choose" | "leaving" | "gone">("loading");

  useEffect(() => {
    document.documentElement.style.overflow = phase === "gone" ? "" : "hidden";
    return () => { document.documentElement.style.overflow = ""; };
  }, [phase]);

  useEffect(() => {
    if (phase !== "loading") return;
    let v = 0;
    const id = window.setInterval(() => {
      const target = document.readyState === "complete" ? 100 : 86;
      v = Math.min(target, v + Math.max(1, (target - v) * 0.12));
      setPct(Math.round(v));
      if (v >= 100) {
        window.clearInterval(id);
        window.setTimeout(() => setPhase("choose"), 250);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [phase]);

  if (phase === "gone") return null;

  const enter = (withSound: boolean) => {
    setEnabled(withSound);
    if (withSound) window.setTimeout(() => play("enter"), 60);
    document.cookie = "br_gate=1; path=/; max-age=21600; samesite=lax";
    setPhase("leaving");
    window.setTimeout(() => setPhase("gone"), 1000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enter Brandrail"
      className={clsx(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f3eefe] px-6 transition-all duration-1000 ease-[cubic-bezier(.7,0,.2,1)]",
        phase === "leaving" && "pointer-events-none -translate-y-full",
      )}
    >
      <div className="text-center">
        <div className="font-serif text-[44px] leading-none tracking-tight text-[#2a1647]">
          brand<span className="text-violet-600">rail</span>
        </div>
        <p className="mt-6 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-[#2a1647]">
          Pre-publication brand governance<br />for the brands of tomorrow
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-14 flex flex-col items-center gap-5">
        {phase === "loading" ? (
          <div className="flex flex-col items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.2em] text-[#2a1647]">{String(pct).padStart(3, "0")}%</span>
            <span className="h-px w-40 bg-[#2a1647]/15"><span className="block h-px bg-violet-600 transition-[width]" style={{ width: `${pct}%` }} /></span>
          </div>
        ) : (
          <>
            <button
              autoFocus
              onClick={() => enter(true)}
              className="fade-up group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-violet-400/60 bg-gradient-to-b from-white/70 to-violet-200/60 px-8 py-3.5 text-[15px] text-[#3b1a74] shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur transition hover:shadow-[0_10px_50px_-6px_rgba(124,58,237,0.75)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition duration-700 group-hover:translate-x-full" />
              <Volume2 size={17} /> Enter with sound
            </button>
            <button onClick={() => enter(false)} className="fade-up inline-flex items-center gap-2 border-b border-[#2a1647]/40 pb-0.5 text-sm text-[#2a1647] transition hover:border-[#2a1647] [animation-delay:120ms]">
              <VolumeX size={15} /> Enter without sound
            </button>
          </>
        )}
      </div>
    </div>
  );
}
