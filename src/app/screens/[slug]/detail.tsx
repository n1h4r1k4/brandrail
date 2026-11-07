"use client";
import { IntroGate } from "@/components/intro-gate";
import { GuideOrb, LandingSettingsProvider, SmoothScroll } from "@/components/landing/bits";
import { SmokeCursor } from "@/components/landing/smoke-cursor";
import { Caption, DAY, DemoForm, DownArrow, GlitchDefs, Header, Hook, ProductShot, SiteFooter } from "@/components/landing/site";
import { SCREENS } from "@/components/landing/content";

interface Props { index: number; hasSession: boolean; showGate: boolean; aiNote: string }

export function ScreenDetail(props: Props) {
  return <LandingSettingsProvider><Inner {...props} /></LandingSettingsProvider>;
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-1 text-lg text-[var(--l-muted)]/70">{children} <DownArrow /></div>
);

function Inner({ index, hasSession, showGate, aiNote }: Props) {
  const s = SCREENS[index];
  const next = SCREENS[(index + 1) % SCREENS.length];
  return (
    <main className="relative min-h-screen bg-[var(--l-bg)] text-[var(--l-ink)]" style={{ ...(DAY as React.CSSProperties), ["--accent" as string]: s.accent }}>
      <GlitchDefs />
      <SmoothScroll />
      {showGate && <IntroGate />}
      <Header hasSession={hasSession} active="screens" />
      <div id="detail" data-tone="light" className="relative">
        <SmokeCursor activeId="detail" />
        <section className="relative z-20 grid min-h-screen gap-12 px-5 pb-12 pt-32 sm:px-12 lg:grid-cols-2">
          <div className="flex flex-col justify-between gap-12">
            <div className="grid max-w-xl grid-cols-2 gap-x-10 gap-y-10">
              <div><Label>Type</Label><p className="mt-3 font-mono text-[12px] font-medium uppercase">{s.type}</p></div>
              <div><Label>Year</Label><p className="mt-3 font-mono text-[12px] font-medium">2026</p></div>
              <div><Label>Scope</Label><div className="mt-3 flex flex-col items-start gap-1.5">{s.scope.map((x) => <span key={x} className="rounded-full border border-[var(--l-line)] px-3 py-1 font-mono text-[11px] font-medium uppercase">{x}</span>)}</div></div>
              <div><Label>Challenge</Label><p className="mt-3 font-mono text-[12px] font-medium uppercase leading-relaxed">{s.challenge}</p></div>
            </div>
            <div>
              <h1 className="font-serif leading-none" style={{ fontSize: "clamp(40px, 5vw, 80px)" }}>{s.name}</h1>
              <Caption className="mt-6">{s.blurb}</Caption>
            </div>
          </div>
          <ProductShot screen={s} info={false} className="lg:w-[82%] lg:justify-self-end" />
        </section>
        <section className="relative z-20 grid gap-8 border-t border-[var(--l-ink)]/80 px-5 py-16 sm:mx-12 sm:px-0 lg:grid-cols-2">
          <h2 className="text-2xl">What it is</h2>
          <p className="font-serif text-[clamp(22px,2.2vw,36px)] leading-[1.15] [text-indent:22%]">↳ {s.what}</p>
        </section>
        <section className="relative z-20 grid gap-8 border-t border-[var(--l-ink)]/80 px-5 py-12 sm:mx-12 sm:px-0 lg:grid-cols-2">
          <h2 className="text-2xl">Highlights <sup className="font-mono text-[11px]">[{s.highlights.length}]</sup></h2>
          <ul>
            {s.highlights.map(([k, v]) => (
              <li key={k} className="flex items-baseline justify-between border-b border-[var(--l-ink)]/70 py-4">
                <span className="font-serif text-[clamp(19px,1.6vw,26px)]">{k}</span>
                <span className="font-mono text-[11px] uppercase">{v}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="relative z-20 flex justify-center pb-24 pt-8"><DemoForm>Try it in the live demo <Hook /></DemoForm></div>
      </div>
      <SiteFooter aiNote={aiNote} next={{ href: `/screens/${next.slug}`, label: next.name }} revealBg="radial-gradient(60% 55% at 50% 55%, #7c3aed66 0%, #1a0b3a 45%, #05030c 100%)" />
      <GuideOrb />
    </main>
  );
}
