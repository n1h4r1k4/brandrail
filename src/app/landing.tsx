"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CornerDownRight } from "lucide-react";
import { IntroGate } from "@/components/intro-gate";
import { AmbientWhileMounted } from "@/components/sound";
import { World } from "@/components/landing/world";
import { SmokeCursor } from "@/components/landing/smoke-cursor";
import { Badge3D, GuideOrb, LandingSettingsProvider, Reveal, ScrollFillText, SmoothScroll, useLanding } from "@/components/landing/bits";
import { Arrow, BIG, BIG_SIZE, Caption, DAY, DemoForm, GlassLink, GlitchDefs, Header, Hook, NIGHT, Pill, ProductShot, SiteFooter } from "@/components/landing/site";
import { PROOF, SCREENS, SERVICES } from "@/components/landing/content";

interface Props { hasSession: boolean; showGate: boolean; aiNote: string; expired: boolean }

export function Landing(props: Props) {
  return (
    <LandingSettingsProvider>
      <Inner {...props} />
    </LandingSettingsProvider>
  );
}

// list on the right of "What it does": the row nearest the middle of the screen is in focus
function FocusList({ items }: { items: string[] }) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [state, setState] = useState<{ op: number[]; active: number }>({ op: items.map(() => 0.2), active: -1 });
  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight * 0.55;
      let best = -1, bestD = Infinity;
      const op = refs.current.map((el, i) => {
        if (!el) return 0.2;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
        return Math.max(0.12, 1 - d / (window.innerHeight * 0.42));
      });
      setState({ op, active: best });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <ol>
      {items.map((s, i) => (
        <li key={s} ref={(el) => { refs.current[i] = el; }} className="flex items-center justify-between gap-6 py-[18px] transition-opacity duration-300" style={{ opacity: state.op[i] }}>
          <span className="w-12 font-mono text-[11px] text-[var(--l-muted)]">
            {state.active === i ? <CornerDownRight size={20} strokeWidth={1.4} className="text-[var(--l-ink)]" /> : `(${String(i + 1).padStart(3, "0")})`}
          </span>
          <span className="text-right font-sans text-[clamp(19px,1.65vw,27px)] tracking-tight">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function ScreenTile({ i, className }: { i: number; className?: string }) {
  const s = SCREENS[i];
  return (
    <Link href={`/screens/${s.slug}`} className={clsx("group block", className)}>
      <ProductShot screen={s} />
      <div className="mt-5 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">{s.tags}</div>
      <div className="mt-2 flex items-center font-serif text-[clamp(24px,2.1vw,34px)] leading-tight">
        <span className="inline-block w-0 overflow-hidden transition-all duration-300 group-hover:mr-3 group-hover:w-6"><CornerDownRight size={22} strokeWidth={1.4} /></span>
        {s.name}
      </div>
    </Link>
  );
}

function Proof() {
  const [active, setActive] = useState(0);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [badgeTop, setBadgeTop] = useState(40);
  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight * 0.5;
      groupRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < mid && r.bottom > mid) setActive(i);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = groupRefs.current[active];
    if (el) setBadgeTop(el.offsetTop + 30);
  }, [active]);
  return (
    <section id="proof" className="px-5 pb-28 sm:px-12">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_1fr]">
        <h2 className={BIG} style={BIG_SIZE}>Proof &amp;<br />numbers</h2>
        <div className="flex flex-wrap items-end justify-between gap-6 pb-2">
          <Caption>Measured on a 44-sample labelled test set and tested end to end on the live site</Caption>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white">» Caught: 58/58</span>
        </div>
      </div>
      <div className="relative mt-12 border-t border-[var(--l-ink)]/80">
        <div className="pointer-events-none absolute left-[22%] hidden h-72 w-60 transition-[top] duration-700 ease-[cubic-bezier(.2,.7,.1,1)] lg:block" style={{ top: badgeTop }}>
          <Badge3D className="h-full w-full" />
        </div>
        {PROOF.map((g, gi) => (
          <div
            key={g.group}
            ref={(el) => { groupRefs.current[gi] = el; }}
            onMouseEnter={() => setActive(gi)}
            className={clsx("grid grid-cols-1 border-b border-[var(--l-line)] transition-opacity duration-500 lg:grid-cols-2", active === gi ? "opacity-100" : "opacity-35")}
          >
            <div className="py-5 font-sans text-[clamp(20px,1.7vw,26px)] uppercase tracking-tight">{g.group} <sup className="font-mono text-[11px]">[{g.count}]</sup></div>
            <ul>
              {g.rows.map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between border-b border-[var(--l-ink)]/70 py-4 last:border-b-0">
                  <span className="font-serif text-[clamp(19px,1.5vw,25px)]">{k}</span>
                  <span className="font-mono text-xs font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-24 flex justify-center"><DemoForm>Open the live demo <Hook /></DemoForm></div>
    </section>
  );
}

function Inner({ hasSession, showGate, aiNote, expired }: Props) {
  const { theme, quality } = useLanding();
  const vars = (theme === "night" ? NIGHT : DAY) as React.CSSProperties;

  return (
    <main id="top" className="relative min-h-screen bg-[var(--l-bg)] text-white" style={vars}>
      <GlitchDefs />
      <SmoothScroll />
      {showGate && <IntroGate />}
      <AmbientWhileMounted />
      <World theme={theme} quality={quality} containerId="world" sections={5} />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent" />
      <Header hasSession={hasSession} />

      {/* ------------------------------------------------ the meadow */}
      <div id="world" className="relative z-10">
        <section className="relative flex h-screen flex-col justify-end px-5 pb-12 sm:px-12">
          <Caption className="mb-12 drop-shadow">Pre-publication brand governance<br />for the brands of tomorrow</Caption>
          {expired && <p className="mb-4 text-sm text-amber-200">Your sandbox wasn&apos;t found. Start a new one from the top right.</p>}
          <div className="grid grid-cols-1 items-start gap-x-[8vw] sm:grid-cols-[auto_1fr]" style={BIG_SIZE}>
            <Reveal className={BIG}><span className="normal-case italic">Where</span></Reveal>
            <div className="sm:mt-[0.9em]">
              <Reveal className={BIG} delay={80}>Every word, image</Reveal>
              <Reveal className={BIG} delay={160}>and claim is checked</Reveal>
              <Reveal className={BIG} delay={240}>before it goes live</Reveal>
            </div>
          </div>
        </section>

        <section className="relative flex h-screen flex-col justify-center px-5 sm:px-12">
          <Pill>Approach</Pill>
          <div className="mt-8" style={BIG_SIZE}>
            <Reveal className={BIG}><span className="normal-case italic">We</span> check</Reveal>
            <Reveal className={BIG} delay={80}><Arrow className="mr-[1.2em]" /> more than</Reveal>
            <Reveal className={BIG} delay={160}>spelling and</Reveal>
            <Reveal className={BIG} delay={240}>style</Reveal>
          </div>
          <Caption className="mt-10">Tone, terms, facts, claims, visuals and accessibility, checked against your own rulebook</Caption>
        </section>

        <section className="relative flex h-screen flex-col justify-end px-5 pb-12 sm:px-12">
          <Pill>Evidence</Pill>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
            <div style={BIG_SIZE}>
              <Reveal className={BIG}>No source</Reveal>
              <Reveal className={BIG} delay={100}><Arrow className="mr-[1.2em]" /> no flag</Reveal>
            </div>
            <Caption className="mb-2 mr-[10vw]">Every flag quotes the text and cites a rule or an approved fact. A verifier drops the rest</Caption>
          </div>
        </section>

        <section className="relative flex h-screen flex-col items-end justify-center px-5 sm:px-12">
          <div className="w-full max-w-[42vw] min-w-[300px]">
            <Pill>Fixes</Pill>
            <div className="mt-6" style={BIG_SIZE}>
              <Reveal className={BIG}>Rewrites <span className="normal-case italic">With</span></Reveal>
              <Reveal className={BIG} delay={100}>an intent</Reveal>
            </div>
            <Caption className="mt-8">Suggestions keep the creator&apos;s goal, message and call to action, and are re-checked before you see them</Caption>
          </div>
        </section>

        <section className="relative flex h-screen flex-col justify-end px-5 pb-12 sm:px-12">
          <Pill>People</Pill>
          <Caption className="mt-6">AI suggests.<br />People decide.</Caption>
          <div className="mt-10 grid grid-cols-1 items-start gap-x-[10vw] sm:grid-cols-[auto_1fr]" style={BIG_SIZE}>
            <Reveal className={BIG}><span className="normal-case italic">We</span> <Arrow /></Reveal>
            <div className="sm:mt-[0.9em]">
              <Reveal className={BIG} delay={80}>keep people in</Reveal>
              <Reveal className={BIG} delay={160}>charge of every</Reveal>
              <Reveal className={BIG} delay={240}>decision</Reveal>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------ light sections with the smoke cursor */}
      <div id="light" data-tone="light" className="relative bg-[var(--l-bg)] text-[var(--l-ink)] transition-colors duration-500">
        <SmokeCursor activeId="light" dark={theme === "night"} />
        <div className="relative z-20">
          <section id="what" className="px-5 pb-32 pt-28 sm:px-12">
            <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <div className="relative">
                  <span className="absolute left-0 top-[0.35em]"><Pill>What it does</Pill></span>
                  <ScrollFillText
                    className="font-serif text-[clamp(24px,2.5vw,40px)] leading-[1.15] [text-indent:28%]"
                    text="↳ Brandrail turns brand guidelines into a living rulebook and checks every word, image and claim before it goes out, from social posts to launch emails. Every flag cites its source, every fix keeps the creator's intent, and people make the final call"
                  />
                </div>
                <div className="mt-16"><DemoForm>Open the live demo <Hook /></DemoForm></div>
              </div>
              <div className="lg:pt-[34vh]"><FocusList items={SERVICES} /></div>
            </div>
          </section>

          <section id="screens" className="px-5 pb-32 sm:px-12">
            <div className="grid grid-cols-2 items-start gap-y-4 lg:grid-cols-[1fr_1fr_0.6fr_auto]" style={BIG_SIZE}>
              <h2 className={BIG}>Some</h2>
              <div>
                <span className={BIG}><span className="normal-case italic">Of the</span></span>
                <Caption className="mt-8 hidden lg:block">A look inside the live product, from first draft to verified record</Caption>
              </div>
              <span className={clsx(BIG, "hidden text-center lg:block")}>–</span>
              <h2 className={clsx(BIG, "text-right")}>Screens</h2>
            </div>
            <div className="mt-20 hidden grid-cols-12 gap-x-8 md:grid">
              <ScreenTile i={0} className="col-span-3" />
              <ScreenTile i={1} className="col-span-2 col-start-7 mt-[16vw]" />
              <ScreenTile i={2} className="col-span-3 col-start-10" />
              <ScreenTile i={3} className="col-span-2 col-start-4 -mt-[6vw]" />
              <ScreenTile i={5} className="col-span-3 col-start-8 mt-[2vw]" />
            </div>
            <div className="mt-10 grid gap-12 md:hidden">
              {[0, 1, 2, 3, 5].map((i) => <ScreenTile key={i} i={i} />)}
            </div>
            <div className="mt-20 flex justify-center"><GlassLink href="/screens">All screens <Hook /></GlassLink></div>
          </section>

          <Proof />
        </div>
      </div>

      <SiteFooter aiNote={aiNote} next={{ href: "/about", label: "About" }} />
      <GuideOrb />
    </main>
  );
}
