"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, Circle, ScanLine } from "lucide-react";
import { IntroGate } from "@/components/intro-gate";
import { GuideOrb, LandingSettingsProvider, useLanding } from "@/components/landing/bits";
import { Conveyor, type ConveyorApi } from "@/components/landing/conveyor";
import { ButtonLink, DemoForm, DemoTargetProvider, Go, HEAD, Header, Label } from "@/components/landing/site";
import { SCREENS } from "@/components/landing/content";

interface Props { hasSession: boolean; showGate: boolean; aiNote: string }

export function ScreensView(props: Props) {
  return <LandingSettingsProvider><Inner {...props} /></LandingSettingsProvider>;
}

function Inner({ hasSession, showGate }: Props) {
  const { quality } = useLanding();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const api = useRef<ConveyorApi | null>(null);
  const images = useMemo(() => SCREENS.map((s) => s.img), []);
  const cur = SCREENS[active];
  return (
    <DemoTargetProvider value={cur.slug}>
    <main className="relative h-screen overflow-hidden bg-[#070b22] text-white">
      {showGate && <IntroGate />}
      <Conveyor images={images} quality={quality} apiRef={api} onActive={setActive} onOpen={(i) => router.push(`/screens/${SCREENS[i].slug}`)} />
      <Header hasSession={hasSession} active="screens" />

      <p className="pointer-events-none absolute inset-x-0 top-24 z-10 hidden text-center text-sm text-indigo-200 sm:block">
        Scroll, drag or use the arrow keys to send the next screen through the checkpoint
      </p>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-6 px-5 pb-8 pr-24 sm:flex-row sm:items-end sm:justify-between sm:px-12 sm:pb-10">
        <div className="pointer-events-auto max-w-lg">
          <Label>Screen {active + 1} of {SCREENS.length} · {cur.tags}</Label>
          <h1 className={clsx(HEAD, "mt-4 text-white")} style={{ fontSize: "clamp(32px, 3.8vw, 58px)" }}>{cur.name}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-indigo-100/85">{cur.blurb}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/screens/${cur.slug}`}>About this screen <Go /></ButtonLink>
            <DemoForm ghost next={cur.slug}>Open it in the demo</DemoForm>
          </div>
        </div>
        <ol className="pointer-events-auto hidden w-64 rounded-3xl border border-white/10 bg-[#0b0f2a]/70 p-2 backdrop-blur-xl lg:block">
          {SCREENS.map((s, i) => (
            <li key={s.slug}>
              <button onClick={() => api.current?.goTo(i)} className={clsx("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition", i === active ? "bg-white/10" : "hover:bg-white/5")}>
                {i < active ? <Check size={15} className="text-teal-300" /> : i === active ? <ScanLine size={15} className="text-teal-200" /> : <Circle size={13} className="text-amber-300/80" />}
                <span className={clsx(i > active && "text-white/60")}>{s.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <GuideOrb />
    </main>
    </DemoTargetProvider>
  );
}
