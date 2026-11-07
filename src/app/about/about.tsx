"use client";
import { useEffect, useRef, useState } from "react";
import { IntroGate } from "@/components/intro-gate";
import { AmbientWhileMounted } from "@/components/sound";
import { Room } from "@/components/landing/room";
import { SmokeCursor } from "@/components/landing/smoke-cursor";
import { GuideOrb, LandingSettingsProvider, Reveal, SmoothScroll, useLanding } from "@/components/landing/bits";
import { Arrow, BIG, BIG_SIZE, Caption, DAY, DownArrow, GlitchDefs, Header, Pill, ProductShot, SiteFooter } from "@/components/landing/site";
import { SCREENS } from "@/components/landing/content";

interface Props { hasSession: boolean; showGate: boolean; aiNote: string }

export function About(props: Props) {
  return (
    <LandingSettingsProvider>
      <Inner {...props} />
    </LandingSettingsProvider>
  );
}

// a huge number that shrinks into the corner as you scroll, with a product shot arriving beside it
function BigNumber() {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setP(Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scale = 1.35 - p * 0.9;
  return (
    <section ref={ref} data-tone="light" className="relative h-[230vh] bg-[var(--l-bg)] text-[var(--l-ink)]">
      <div className="sticky top-0 h-screen overflow-hidden px-5 sm:px-12">
        <div className="absolute right-5 top-24 w-[min(46vw,620px)] transition-all duration-700 sm:right-12" style={{ opacity: Math.min(1, Math.max(0, (p - 0.3) * 3)), transform: `translateY(${(1 - Math.min(1, p * 1.6)) * 60}px)` }}>
          <ProductShot screen={SCREENS[1]} tall={false} info={false} />
          <Caption className="mt-4">The record every approved piece leaves behind</Caption>
        </div>
        <div className="absolute bottom-6 left-5 origin-bottom-left font-sans font-semibold leading-[0.8] tracking-[-0.04em] sm:left-12" style={{ fontSize: "24vw", transform: `scale(${scale})` }}>
          58/58
        </div>
        <Caption className="absolute bottom-10 right-5 text-right sm:right-12" >
          <span style={{ opacity: Math.min(1, p * 2) }}>Blockers caught on the<br />44-sample labelled test set</span>
        </Caption>
      </div>
    </section>
  );
}

const STEPS: [string, string, string][] = [
  ["Bring the guide", "Upload the brand guide. Rules are compiled with their page citations and every change becomes a new version", "Rulebook"],
  ["Check a draft", "Paste copy or add an image. 24 rule-based detectors and a grounded AI review run together", "Checks"],
  ["Fix with intent", "Each finding comes with a rewrite that keeps the goal, message and call to action, re-checked before you see it", "Fix studio"],
  ["Approve and verify", "Reviewers and compliance sign off in order. The result is Brandrail Verified, with a tamper-evident audit trail", "Approvals"],
];

function Inner({ hasSession, showGate, aiNote }: Props) {
  const { quality } = useLanding();
  return (
    <main className="relative min-h-screen bg-[#0d0720] text-white" style={DAY as React.CSSProperties}>
      <GlitchDefs />
      <SmoothScroll />
      {showGate && <IntroGate />}
      <AmbientWhileMounted />
      <Room quality={quality} containerId="room" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-t from-black/45 to-transparent" />
      <Header hasSession={hasSession} active="about" />

      <div id="room" className="relative z-10">
        <section className="flex h-screen flex-col justify-end px-5 pb-12 sm:px-12">
          <Caption className="mb-10">Hi. This is Brandrail, and it cares<br />about one thing more than most</Caption>
          <div style={BIG_SIZE}>
            <Reveal className={BIG}>People don&apos;t remember</Reveal>
            <Reveal className={BIG} delay={80}>rulebooks <DownArrow className="ml-[0.4em] h-[0.42em] w-[0.42em]" /></Reveal>
            <Reveal className={BIG} delay={160}><Arrow className="mr-[1.6em]" /> they remember</Reveal>
            <Reveal className={BIG} delay={240}>how a brand made them <span className="normal-case italic">feel</span></Reveal>
          </div>
        </section>

        <section className="flex h-screen flex-col items-center justify-between px-5 pb-12 pt-32 text-center sm:px-12">
          <div style={BIG_SIZE}>
            <Reveal className={BIG}>A checkpoint for every</Reveal>
            <Reveal className={BIG} delay={80}>word a brand puts</Reveal>
            <Reveal className={BIG} delay={160}><Arrow className="mr-[0.6em]" /> out into the world</Reveal>
          </div>
          <Caption className="text-center">For creators, reviewers<br />and compliance teams</Caption>
        </section>

        <section className="flex h-screen flex-col items-end justify-center px-5 sm:px-12">
          <div className="w-full max-w-[44vw] min-w-[300px]">
            <Pill>How it thinks</Pill>
            <div className="mt-6" style={BIG_SIZE}>
              <Reveal className={BIG}>It starts with</Reveal>
              <Reveal className={BIG} delay={100}><span className="normal-case italic">Evidence</span></Reveal>
            </div>
            <Caption className="mt-8 max-w-md">Before it flags anything, Brandrail finds the rule or approved fact behind it. No source, no flag. The AI comes second, the evidence comes first</Caption>
          </div>
        </section>

        <section className="flex h-screen flex-col justify-center px-5 sm:px-12">
          <Pill>The feeling</Pill>
          <div className="mt-6" style={BIG_SIZE}>
            <Reveal className={BIG}>A good check</Reveal>
            <Reveal className={BIG} delay={80}>gets noticed</Reveal>
            <Reveal className={BIG} delay={160}><Arrow className="mr-[1.2em]" /> a great one</Reveal>
            <Reveal className={BIG} delay={240}><span className="normal-case italic">Gets trusted</span></Reveal>
          </div>
          <Caption className="mt-8 max-w-md">That space between &ldquo;flagged&rdquo; and &ldquo;I see why&rdquo; is where Brandrail lives. Every finding explains itself</Caption>
        </section>

        <section className="flex h-screen flex-col justify-end px-5 pb-12 sm:px-12">
          <Pill>Who built it</Pill>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
            <div style={BIG_SIZE}>
              <Reveal className={BIG}>One person.</Reveal>
              <Reveal className={BIG} delay={100}><Arrow className="mr-[1.2em]" /> one standard</Reveal>
            </div>
            <Caption className="mb-2 max-w-md">Built solo by Caffiene Addict for the We Code Coders hackathon. Every rule, check and screen was designed, built and tested by one person</Caption>
          </div>
        </section>
      </div>

      <BigNumber />

      <section id="process" data-tone="light" className="relative bg-[var(--l-bg)] px-5 pb-24 pt-10 text-[var(--l-ink)] sm:px-12">
        <SmokeCursor activeId="process" />
        <div className="relative z-20">
          <div className="grid items-end gap-8 lg:grid-cols-2">
            <div>
              <Pill>How it works</Pill>
              <h2 className={`${BIG} mt-6`} style={BIG_SIZE}>From guide <Arrow className="mx-[0.3em]" /><br />to verified</h2>
            </div>
            <Caption className="pb-2">Four steps, one record. Every decision can be traced back to a rule, a fact or a person</Caption>
          </div>
          <ol className="mt-14 border-t border-[var(--l-ink)]/80">
            {STEPS.map(([title, body, tag], i) => (
              <li key={title} className="group grid gap-4 border-b border-[var(--l-line)] py-7 transition hover:pl-3 lg:grid-cols-[120px_1fr_1.3fr_auto] lg:items-baseline">
                <span className="font-mono text-[11px] text-[var(--l-muted)]">({String(i + 1).padStart(3, "0")})</span>
                <span className="font-serif text-[clamp(22px,2vw,32px)]">{title}</span>
                <span className="max-w-xl font-mono text-[11px] font-medium uppercase leading-relaxed tracking-[0.08em] text-[var(--l-muted)]">{body}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em]">{tag}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SiteFooter aiNote={aiNote} next={{ href: "/screens", label: "Screens" }} revealBg="radial-gradient(60% 55% at 50% 55%, #7c3aed66 0%, #1a0b3a 45%, #05030c 100%)" />
      <GuideOrb />
    </main>
  );
}
