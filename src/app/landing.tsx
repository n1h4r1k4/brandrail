"use client";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { IntroGate } from "@/components/intro-gate";
import { AmbientWhileMounted } from "@/components/sound";
import { World } from "@/components/landing/world";
import { SmokeCursor } from "@/components/landing/smoke-cursor";
import { GuideOrb, LandingSettingsProvider, Reveal, ScrollFillText, SmoothScroll, useLanding } from "@/components/landing/bits";
import { ButtonLink, CountUp, DAY, DemoForm, Go, HEAD, KeepScrolling, HEAD_SIZE, Header, Label, Lede, Mark, NIGHT, ProductShot, SiteFooter, SUB_SIZE } from "@/components/landing/site";
import { PROOF, SCREENS } from "@/components/landing/content";

interface Props { hasSession: boolean; showGate: boolean; aiNote: string; expired: boolean }

export function Landing(props: Props) {
  return (
    <LandingSettingsProvider>
      <Inner {...props} />
    </LandingSettingsProvider>
  );
}

// six real kinds of finding, from the demo's fictional brand
const CHECKS: { area: string; rule: string; bad: string; fix: string }[] = [
  { area: "Tone of voice", rule: "TON-03", bad: "Act now or miss out forever!", fix: "Switch this Diwali and get cashback on every payment." },
  { area: "Brand terms", rule: "TRM-01", bad: "Download Nimbus pay today", fix: "Download Nimbus Pay today" },
  { area: "Facts & offers", rule: "LEG-01 · F-041", bad: "5% cashback till 31 Oct", fix: "3% cashback, up to ₹150, till 30 Nov" },
  { area: "Claims", rule: "CLM-04", bad: "India's fastest UPI app", fix: "UPI payments that complete in about 2 seconds" },
  { area: "Visuals", rule: "ACC-01", bad: "Image text contrast 1.6 : 1", fix: "Raise contrast to at least 4.5 : 1" },
  { area: "Accessibility", rule: "ACC-03", bad: "No alt text on the offer image", fix: "Add alt text that states the offer" },
];

const STATS: [string, string][] = [["100%", "Precision of the rule-based checks"], ["100%", "Recall once the AI review is on"], ["0", "False flags on clean controls"], ["₹0", "To run, on free tiers"]];

function Inner({ hasSession, showGate, aiNote, expired }: Props) {
  const { theme, quality } = useLanding();
  const vars = (theme === "night" ? NIGHT : DAY) as React.CSSProperties;

  return (
    <main data-site id="top" className="relative min-h-screen bg-[var(--l-bg)] text-white" style={vars}>
      <SmoothScroll />
      {showGate && <IntroGate />}
      <AmbientWhileMounted />
      <World theme={theme} quality={quality} containerId="world" sections={5} />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-1/2 bg-gradient-to-t from-[#0b0f2a]/40 to-transparent" />
      <Header hasSession={hasSession} />

      {/* ------------------------------------------------ the meadow at dawn */}
      <div id="world" className="relative z-10">
        <section className="relative flex h-screen flex-col justify-end px-5 pb-14 sm:px-12">
          {expired && <p className="mb-4 text-sm text-amber-200">Your sandbox wasn&apos;t found. Start a new one from the top right.</p>}
          <Label>Pre-publication brand governance</Label>
          <div className="mt-5 max-w-4xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>Every word, image and claim,</Reveal>
            <Reveal className={HEAD} delay={100}><Mark>checked</Mark> before it goes live.</Reveal>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <DemoForm>Try the demo <Go /></DemoForm>
            <ButtonLink href="/about" ghost>How it works</ButtonLink>
          </div>
          <KeepScrolling className="absolute bottom-5 left-1/2 -translate-x-1/2" />
        </section>

        <section className="relative flex h-screen flex-col justify-center px-5 sm:px-12">
          <Label>What it checks</Label>
          <div className="mt-5 max-w-2xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>Tone, terms, facts, claims,</Reveal>
            <Reveal className={HEAD} delay={100}>visuals and accessibility,</Reveal>
            <Reveal className={HEAD} delay={200}>against <Mark>your</Mark> rulebook.</Reveal>
          </div>
        </section>

        <section className="relative flex h-screen flex-col justify-end px-5 pb-14 sm:px-12">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <Label>Evidence</Label>
              <div className="mt-5" style={HEAD_SIZE}>
                <Reveal className={HEAD}>No source, <Mark>no flag.</Mark></Reveal>
              </div>
            </div>
            <Lede className="mb-2 max-w-sm">Every finding quotes the exact words and cites a page of the rulebook or an approved fact. A verifier drops anything it can&apos;t trace.</Lede>
          </div>
        </section>

        <section className="relative flex h-screen flex-col items-end justify-center px-5 text-right sm:px-12">
          <Label>Fixes</Label>
          <div className="mt-5 max-w-xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>Rewrites that keep</Reveal>
            <Reveal className={HEAD} delay={100}>what the creator <Mark>meant.</Mark></Reveal>
          </div>
          <Lede className="mt-6">Goal, message and call to action are locked first, and every suggestion is re-checked before you see it.</Lede>
        </section>

        <section className="relative flex h-screen flex-col items-center justify-end px-5 pb-16 text-center sm:px-12">
          <Label>Sign-off</Label>
          <div className="mt-5" style={HEAD_SIZE}>
            <Reveal className={HEAD}>AI suggests. <Mark>People decide.</Mark></Reveal>
          </div>
          <Lede className="mt-6 text-center">Reviewers and compliance approve in order, overrides need a reason, and every step is written to a tamper-evident log.</Lede>
        </section>
      </div>

      {/* ------------------------------------------------ light sections with the cursor trail */}
      <div id="light" data-tone="light" className="relative bg-[var(--l-bg)] text-[var(--l-ink)] transition-colors duration-500">
        <SmokeCursor activeId="light" dark={theme === "night"} />
        <div className="relative z-20">
          <section id="what" className="px-5 pb-28 pt-32 sm:px-12">
            <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr]">
              <div className="lg:sticky lg:top-32 lg:self-start">
                <Label className="text-[var(--l-accent)]">What it does</Label>
                <ScrollFillText
                  className="mt-6 font-serif leading-[1.18]" style={SUB_SIZE}
                  text="Brandrail turns your brand guide into rules software can enforce, then checks every draft against them before it ships. Each flag shows its source and comes with a fix that keeps the creator's meaning, and people make the final call."
                />
                <div className="mt-10"><DemoForm>Open the live demo <Go /></DemoForm></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {CHECKS.map((c) => (
                  <div key={c.area} className="rounded-2xl border border-[var(--l-line)] bg-[var(--l-card)] p-5 shadow-[0_10px_30px_-24px_rgba(18,23,53,0.6)] backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{c.area}</span>
                      <span className="rounded-md bg-[var(--l-chip)] px-2 py-0.5 font-mono text-[10px] text-[var(--l-chip-ink)]">{c.rule}</span>
                    </div>
                    <p className="mt-4 text-[15px] text-[var(--l-bad)] line-through decoration-rose-400/70">{c.bad}</p>
                    <p className="mt-2 flex gap-2 text-[15px] text-[var(--l-good)]"><ArrowRight size={16} className="mt-1 shrink-0" />{c.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="screens" className="px-5 pb-28 sm:px-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Label className="text-[var(--l-accent)]">Inside the product</Label>
                <h2 className={clsx(HEAD, "mt-5")} style={HEAD_SIZE}>From first draft to <Mark>verified</Mark> record.</h2>
              </div>
              <Link href="/screens" className="inline-flex items-center gap-2 text-[15px] text-[var(--l-accent)] hover:underline">All eight screens <Go /></Link>
            </div>
            <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 5, 6].map((i, k) => {
                const s = SCREENS[i];
                return (
                  <Link key={s.slug} href={`/screens/${s.slug}`} className={clsx("group block", k % 3 === 1 && "lg:mt-16")}>
                    <ProductShot screen={s} />
                    <div className="mt-4 flex items-baseline justify-between gap-3">
                      <span className="font-serif text-[clamp(22px,1.9vw,30px)] transition group-hover:text-[var(--l-accent)]">{s.name}</span>
                      <span className="text-xs text-[var(--l-muted)]">{s.tags}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section id="proof" className="px-5 pb-12 sm:px-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Label className="text-[var(--l-accent)]">Proof</Label>
                <h2 className={clsx(HEAD, "mt-5")} style={HEAD_SIZE}>Proof, not <Mark>promises.</Mark></h2>
              </div>
              <Lede className="text-[var(--l-muted)]">Measured on a 44-sample labelled test set, then tested end to end on the live site. 58 of 58 blockers caught.</Lede>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map(([v, k]) => (
                <div key={k} className="rounded-3xl bg-[var(--l-tile)] p-6 text-white">
                  <CountUp value={v} className="block font-serif text-[clamp(44px,4.6vw,72px)] leading-none" />
                  <span className="mt-4 block text-sm text-indigo-200">{k}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {PROOF.map((g) => (
                <div key={g.group} className="rounded-3xl border border-[var(--l-line)] bg-[var(--l-card)] p-6">
                  <div className="flex items-center justify-between text-sm font-semibold">{g.group}<span className="rounded-full bg-[var(--l-teal-chip)] px-2 py-0.5 font-mono text-[11px] text-[var(--l-good)]">{g.count}</span></div>
                  <ul className="mt-3 divide-y divide-[var(--l-line)]">
                    {g.rows.map(([k, v]) => (
                      <li key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                        <span className="text-[var(--l-muted)]">{k}</span>
                        <span className="font-mono text-xs font-semibold">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <SiteFooter aiNote={aiNote} next={{ href: "/about", label: "How it works" }} auto />
      <GuideOrb />
    </main>
  );
}

