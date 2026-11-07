"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "./sound";
import { LogoMark } from "./ui";

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
        "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#070b22] px-6 text-white transition-all duration-1000 ease-[cubic-bezier(.7,0,.2,1)]",
        phase === "leaving" && "pointer-events-none opacity-0 [transform:scale(1.04)]",
      )}
    >
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-indigo-600/40 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-teal-400/25 blur-[100px]" />
      <div className="relative flex flex-col items-center text-center">
        <LogoMark size={64} />
        <div className="mt-6 font-serif text-[46px] leading-none tracking-tight">Brandrail</div>
        <p className="mt-4 text-[15px] text-indigo-100/80">Pre-publication brand governance. Guardrails, not gatekeepers.</p>
      </div>
      <div className="relative mt-14 flex h-28 w-full max-w-sm flex-col items-center justify-start gap-4">
        {phase === "loading" ? (
          <>
            <span className="h-1 w-full overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-indigo-400 to-teal-300 transition-[width]" style={{ width: `${pct}%` }} /></span>
            <span className="text-xs text-indigo-200/80">Loading the rulebook · {pct}%</span>
          </>
        ) : (
          <>
            <button autoFocus onClick={() => enter(true)} className="fade-up inline-flex items-center gap-2.5 rounded-full bg-indigo-600 px-7 py-3 text-[15px] font-medium shadow-[0_12px_30px_-10px_rgba(79,70,229,0.9)] transition hover:bg-indigo-500">
              <Volume2 size={17} /> Start with sound
            </button>
            <button onClick={() => enter(false)} className="fade-up inline-flex items-center gap-2 text-sm text-indigo-100/80 transition hover:text-white [animation-delay:120ms]">
              <VolumeX size={15} /> Start without sound
            </button>
          </>
        )}
      </div>
    </div>
  );
}
