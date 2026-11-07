"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CornerDownRight, SlidersHorizontal } from "lucide-react";
import { IntroGate } from "@/components/intro-gate";
import { GuideOrb, LandingSettingsProvider, useLanding } from "@/components/landing/bits";
import { Carousel, type CarouselApi } from "@/components/landing/carousel";
import { Caption, Header } from "@/components/landing/site";
import { SCREENS } from "@/components/landing/content";

interface Props { hasSession: boolean; showGate: boolean; aiNote: string }
const AREAS = ["All", "Checking", "Approvals", "Governance"] as const;

export function ScreensView(props: Props) {
  return <LandingSettingsProvider><Inner {...props} /></LandingSettingsProvider>;
}

function Inner({ hasSession, showGate }: Props) {
  const { quality } = useLanding();
  const router = useRouter();
  const [area, setArea] = useState<(typeof AREAS)[number]>("All");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const api = useRef<CarouselApi | null>(null);
  const list = useMemo(() => SCREENS.filter((s) => area === "All" || s.area === area), [area]);
  const items = useMemo(() => list.map((s) => ({ img: s.img, accent: s.accent })), [list]);
  const cur = list[active] ?? list[0];
  return (
    <main className="relative h-screen overflow-hidden bg-[#040308] text-white" style={{ ["--accent" as string]: cur.accent }}>
      {showGate && <IntroGate />}
      <Carousel key={area} items={items} quality={quality} apiRef={api} onActive={setActive} onOpen={(i) => router.push(`/screens/${list[i].slug}`)} />
      <Header hasSession={hasSession} active="screens" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col-reverse items-start justify-between gap-6 px-5 pb-10 pr-24 sm:flex-row sm:items-end sm:px-12">
        <div className="pointer-events-auto">
          <button onClick={() => router.push(`/screens/${cur.slug}`)} className="flex items-center gap-4 text-left font-serif leading-none" style={{ fontSize: "clamp(34px, 4.2vw, 66px)" }}>
            <CornerDownRight size={30} strokeWidth={1.3} /> {cur.name}
          </button>
          <Caption className="mt-6">{cur.blurb}</Caption>
        </div>
        <div className="pointer-events-auto relative flex flex-row-reverse items-center gap-5 sm:flex-col">
          {open && (
            <div className="fade-up absolute bottom-24 w-48 rounded-2xl border border-white/15 bg-[#1b1240]/90 p-1.5 font-mono text-[11px] uppercase tracking-[0.12em] backdrop-blur-xl">
              {AREAS.map((a) => (
                <button key={a} onClick={() => { setArea(a); setActive(0); setOpen(false); }} className={clsx("block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10", a === area && "text-violet-300")}>{a}</button>
              ))}
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-3 rounded-full border border-violet-400/70 bg-violet-950/60 px-7 py-3 text-[15px] backdrop-blur">
            Filter <SlidersHorizontal size={16} />
          </button>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span>{String(active + 1).padStart(2, "0")}</span>
            <span className="flex items-center gap-1.5">
              {list.map((s, i) => (
                <button key={s.slug} aria-label={s.name} onClick={() => api.current?.goTo(i)} className={clsx("h-5 rounded-sm border-white transition-all", i === active ? "w-3 border" : "w-px bg-white/70")} />
              ))}
            </span>
            <span>{String(list.length).padStart(2, "0")}</span>
          </div>
        </div>
        <div className="hidden w-64 lg:block" />
      </div>
      <GuideOrb />
    </main>
  );
}
