"use client";
import clsx from "clsx";
import { BookOpenCheck, ClipboardCheck, PenLine, ShieldCheck } from "lucide-react";
import { IntroGate } from "@/components/intro-gate";
import { AmbientWhileMounted } from "@/components/sound";
import { EvidenceScene } from "@/components/landing/evidence";
import { SmokeCursor } from "@/components/landing/smoke-cursor";
import { GuideOrb, LandingSettingsProvider, Reveal, SmoothScroll, useLanding } from "@/components/landing/bits";
import { CountUp, DAY, NIGHT, DemoForm, Go, HEAD, KeepScrolling, HEAD_SIZE, Header, Label, Lede, Mark, SiteFooter } from "@/components/landing/site";

interface Props { hasSession: boolean; showGate: boolean; aiNote: string }

export function About(props: Props) {
  return (
    <LandingSettingsProvider>
      <Inner {...props} />
    </LandingSettingsProvider>
  );
}

const STEPS = [
  { icon: BookOpenCheck, title: "Bring the guide", body: "Upload the brand guide. Rules are compiled with their page citations, and every change becomes a new version." },
  { icon: PenLine, title: "Check a draft", body: "Paste copy or add an image. 24 rule-based detectors and a grounded AI review run together." },
  { icon: ClipboardCheck, title: "Fix with intent", body: "Each finding comes with a rewrite that keeps the goal, message and call to action, re-checked before you see it." },
  { icon: ShieldCheck, title: "Approve and verify", body: "Reviewers and compliance sign off in order. The result is Brandrail Verified, with a tamper-evident trail." },
];

const STATS: [string, string][] = [["29", "Rules with page citations"], ["24", "Rule-based detectors"], ["13", "Facts with expiry dates"], ["4", "Roles in the approval flow"]];

function Inner({ hasSession, showGate, aiNote }: Props) {
  const { quality, theme } = useLanding();
  return (
    <main data-site className="relative min-h-screen bg-[#070b22] text-white" style={(theme === "night" ? NIGHT : DAY) as React.CSSProperties}>
      <SmoothScroll />
      {showGate && <IntroGate />}
      <AmbientWhileMounted />
      <EvidenceScene quality={quality} containerId="map" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-t from-[#04061a]/70 to-transparent" />
      <Header hasSession={hasSession} active="about" />

      <div id="map" className="relative z-10 [text-shadow:0_2px_22px_rgba(4,6,26,0.95)]">
        <section className="relative flex h-screen flex-col justify-end px-5 pb-14 sm:px-12">
          <Label>How it works</Label>
          <div className="mt-5 max-w-4xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>A brand guide only works</Reveal>
            <Reveal className={HEAD} delay={100}>if it&apos;s used on <Mark>every</Mark> post.</Reveal>
          </div>
          <Lede className="mt-6">Brandrail turns the guide into checks that run on every draft, so nobody has to remember what page 37 said.</Lede>
          <KeepScrolling className="absolute bottom-5 left-1/2 -translate-x-1/2" />
        </section>

        <section className="flex h-screen flex-col items-center justify-center px-5 text-center sm:px-12">
          <Label>Evidence first</Label>
          <div className="mt-5 max-w-3xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>Every flag is tied to a rule</Reveal>
            <Reveal className={HEAD} delay={100}>or a fact <Mark>you</Mark> approved.</Reveal>
          </div>
          <Lede className="mt-6 text-center">Each card around the core is a rule or fact from the demo brand. A finding has to link to one of them, or it isn&apos;t shown.</Lede>
        </section>

        <section className="flex h-screen flex-col items-end justify-center px-5 text-right sm:px-12">
          <Label>Two kinds of check</Label>
          <div className="mt-5 max-w-xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>Rules catch the certain.</Reveal>
            <Reveal className={HEAD} delay={100}>AI catches the <Mark>subtle.</Mark></Reveal>
          </div>
          <Lede className="mt-6">A verifier keeps both honest: anything it can&apos;t trace back to the rulebook is dropped before you see it.</Lede>
        </section>

        <section className="flex h-screen flex-col justify-center px-5 sm:px-12">
          <Label>Privacy</Label>
          <div className="mt-5 max-w-2xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>Confidential terms are <Mark>masked</Mark></Reveal>
            <Reveal className={HEAD} delay={100}>before any AI sees them.</Reveal>
          </div>
          <Lede className="mt-6">Images are read and colour-checked in your browser, and personal data is replaced with placeholders before a request leaves the server.</Lede>
        </section>

        <section className="flex h-screen flex-col justify-end px-5 pb-14 sm:px-12">
          <Label>Who built it</Label>
          <div className="mt-5 max-w-3xl" style={HEAD_SIZE}>
            <Reveal className={HEAD}>A solo build for the</Reveal>
            <Reveal className={HEAD} delay={100}>We Code Coders <Mark>hackathon.</Mark></Reveal>
          </div>
          <Lede className="mt-6">Designed, built and tested by Caffiene Addict, running on free tiers end to end.</Lede>
        </section>
      </div>

      <div id="steps" data-tone="light" className="relative bg-[var(--l-bg)] text-[var(--l-ink)]">
        <SmokeCursor activeId="steps" dark={theme === "night"} />
        <section className="relative z-20 px-5 pb-10 pt-28 sm:px-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map(([v, k]) => (
              <div key={k} className="rounded-3xl bg-[var(--l-tile)] p-6 text-white">
                <CountUp value={v} className="block font-serif text-[clamp(44px,4.6vw,72px)] leading-none" />
                <span className="mt-4 block text-sm text-indigo-200">{k}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="relative z-20 px-5 pb-16 pt-16 sm:px-12">
          <Label className="text-[var(--l-accent)]">Four steps</Label>
          <h2 className={clsx(HEAD, "mt-5 max-w-3xl")} style={HEAD_SIZE}>From the brand guide to a <Mark>verified</Mark> post.</h2>
          <ol className="relative mt-14 grid gap-6 lg:grid-cols-4">
            <span className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-indigo-400 to-teal-300 lg:block" />
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative">
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-[0_10px_24px_-10px_rgba(79,70,229,0.8)]"><Icon size={22} /></span>
                <div className="mt-5 font-mono text-xs text-[var(--l-muted)]">Step {i + 1}</div>
                <div className="mt-1 font-serif text-[clamp(22px,1.9vw,30px)]">{title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--l-muted)]">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14"><DemoForm>Try the four steps in the demo <Go /></DemoForm></div>
        </section>
      </div>

      <SiteFooter aiNote={aiNote} next={{ href: "/screens", label: "Screens" }} auto />
      <GuideOrb />
    </main>
  );
}
