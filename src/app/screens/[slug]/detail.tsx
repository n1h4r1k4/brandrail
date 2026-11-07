"use client";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Check } from "lucide-react";
import { IntroGate } from "@/components/intro-gate";
import { GuideOrb, LandingSettingsProvider, SmoothScroll } from "@/components/landing/bits";
import { SmokeCursor } from "@/components/landing/smoke-cursor";
import { ButtonLink, DAY, DemoForm, DemoTargetProvider, Go, HEAD, HEAD_SIZE, Header, Label, Lede, ProductShot, SiteFooter } from "@/components/landing/site";
import { SCREENS } from "@/components/landing/content";

interface Props { index: number; hasSession: boolean; showGate: boolean; aiNote: string }

export function ScreenDetail(props: Props) {
  return (
    <LandingSettingsProvider>
      <DemoTargetProvider value={SCREENS[props.index].slug}><Inner {...props} /></DemoTargetProvider>
    </LandingSettingsProvider>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{children}</span>
);

function Inner({ index, hasSession, showGate, aiNote }: Props) {
  const s = SCREENS[index];
  const prev = SCREENS[(index + SCREENS.length - 1) % SCREENS.length];
  const next = SCREENS[(index + 1) % SCREENS.length];
  return (
    <main className="relative min-h-screen bg-[var(--l-bg)] text-[var(--l-ink)]" style={DAY as React.CSSProperties}>
      <SmoothScroll />
      {showGate && <IntroGate />}
      <Header hasSession={hasSession} active="screens" />
      <div id="detail" data-tone="light" className="relative">
        <SmokeCursor activeId="detail" />
        <section className="relative z-20 grid items-center gap-12 px-5 pb-16 pt-32 sm:px-12 lg:min-h-screen lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Link href="/screens" className="inline-flex items-center gap-2 text-sm text-[var(--l-muted)] hover:text-indigo-700"><ArrowLeft size={15} /> All screens</Link>
            <div className="mt-8"><Label className="text-indigo-700">Screen {index + 1} of {SCREENS.length}</Label></div>
            <h1 className={clsx(HEAD, "mt-5")} style={HEAD_SIZE}>{s.name}</h1>
            <Lede className="mt-5 text-[var(--l-muted)]">{s.blurb}.</Lede>
            <div className="mt-8 flex flex-wrap gap-3">
              <DemoForm next={s.slug}>Open {s.name} in the demo <Go /></DemoForm>
            </div>
          </div>
          <ProductShot screen={s} tall={false} />
        </section>

        <section className="relative z-20 px-5 sm:px-12">
          <div className="grid gap-px overflow-hidden rounded-3xl border border-[var(--l-line)] bg-[var(--l-line)] sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/85 p-6"><div className="text-xs font-semibold uppercase tracking-wider text-[var(--l-muted)]">Type</div><p className="mt-3 font-serif text-2xl">{s.type}</p></div>
            <div className="bg-white/85 p-6"><div className="text-xs font-semibold uppercase tracking-wider text-[var(--l-muted)]">Covers</div><div className="mt-3 flex flex-wrap gap-2">{s.scope.map((x) => <Chip key={x}>{x}</Chip>)}</div></div>
            <div className="bg-white/85 p-6"><div className="text-xs font-semibold uppercase tracking-wider text-[var(--l-muted)]">Problem it solves</div><p className="mt-3 text-[15px] leading-relaxed">{s.challenge}.</p></div>
            <div className="bg-white/85 p-6"><div className="text-xs font-semibold uppercase tracking-wider text-[var(--l-muted)]">Built with</div><div className="mt-3 flex flex-wrap gap-2">{s.stack.map((x) => <Chip key={x}>{x}</Chip>)}</div></div>
          </div>
        </section>

        <section className="relative z-20 grid gap-12 px-5 py-20 sm:px-12 lg:grid-cols-2">
          <div>
            <Label className="text-indigo-700">How it works</Label>
            <p className="mt-5 font-serif text-[clamp(22px,2vw,32px)] leading-[1.25]">{s.what}.</p>
          </div>
          <div>
            <Label className="text-indigo-700">What you&apos;ll see</Label>
            <ul className="mt-5 space-y-3">
              {s.highlights.map(([k, v]) => (
                <li key={k} className="flex items-start gap-3 rounded-2xl border border-[var(--l-line)] bg-white/70 p-4">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-400 text-[#06302c]"><Check size={14} strokeWidth={3} /></span>
                  <span className="flex-1 text-[15px]">{k}</span>
                  <span className="text-xs text-[var(--l-muted)]">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="relative z-20 grid gap-4 px-5 pb-8 sm:grid-cols-2 sm:px-12">
          {[["Previous", prev], ["Next", next]].map(([label, x]) => {
            const sc = x as typeof s;
            return (
              <Link key={label as string} href={`/screens/${sc.slug}`} className="group flex items-center justify-between gap-4 rounded-3xl border border-[var(--l-line)] bg-white/70 p-6 transition hover:border-indigo-300">
                <span><span className="block text-xs text-[var(--l-muted)]">{label as string}</span><span className="font-serif text-2xl group-hover:text-indigo-700">{sc.name}</span></span>
                <Go />
              </Link>
            );
          })}
        </section>
        <div className="relative z-20 px-5 sm:px-12"><ButtonLink href="/screens" ghost>Back to the conveyor</ButtonLink></div>
      </div>
      <SiteFooter aiNote={aiNote} next={{ href: `/screens/${next.slug}`, label: next.name }} />
      <GuideOrb />
    </main>
  );
}
