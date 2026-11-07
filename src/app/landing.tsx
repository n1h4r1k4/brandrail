"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowRight, CornerDownRight, MoveRight } from "lucide-react";
import { IntroGate } from "@/components/intro-gate";
import { AmbientWhileMounted, SoundToggle, useSound } from "@/components/sound";
import { World } from "@/components/landing/world";
import { SmokeCursor } from "@/components/landing/smoke-cursor";
import { Badge3D, GuideOrb, LandingSettingsProvider, Reveal, ScrollFillText, SettingsMenu, SmoothScroll, useLanding } from "@/components/landing/bits";

interface Props { hasSession: boolean; showGate: boolean; aiNote: string; expired: boolean }

export function Landing(props: Props) {
  return (
    <LandingSettingsProvider>
      <Inner {...props} />
    </LandingSettingsProvider>
  );
}

const DAY = { "--l-bg": "#f4effd", "--l-ink": "#2a1647", "--l-faint": "#cbbfe6", "--l-muted": "#6d5c93", "--l-line": "rgba(42,22,71,0.16)" };
const NIGHT = { "--l-bg": "#0c0920", "--l-ink": "#f1edff", "--l-faint": "#3e3466", "--l-muted": "#a79ed0", "--l-line": "rgba(255,255,255,0.12)" };

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-block w-fit self-start rounded-full bg-violet-600 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white">{children}</span>;
}
function Caption({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("max-w-sm font-mono text-[11px] uppercase leading-[1.35] tracking-[0.12em]", className)}>{children}</p>;
}
const BIG = "font-serif uppercase leading-[0.95] tracking-[-0.02em]";
const BIG_SIZE = { fontSize: "clamp(38px, 5.6vw, 92px)" };
const Arrow = ({ className }: { className?: string }) => <CornerDownRight className={clsx("inline-block h-[0.42em] w-[0.42em]", className)} strokeWidth={1.25} />;

function DemoForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const { play } = useSound();
  return (
    <form action="/api/demo" method="post" onSubmit={() => play("success")}>
      <button className={className}>{children}</button>
    </form>
  );
}

function Header({ hasSession }: { hasSession: boolean }) {
  const [overLight, setOverLight] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const light = document.getElementById("light");
      setOverLight(Boolean(light && light.getBoundingClientRect().top < 40));
      // hide while scrolling down, come back on any scroll up
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 120);
        lastY = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const tone = overLight ? "text-[var(--l-ink)]" : "text-white";
  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-30 transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(.7,0,.2,1)]",
        tone,
        hidden && "-translate-y-full",
        overLight && "bg-[var(--l-bg)]/75 backdrop-blur-md",
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-12">
        <a href="#top" className="font-serif text-[28px] leading-none tracking-tight">brand<span className="text-violet-400">rail</span></a>
        <nav className="hidden items-center gap-8 font-mono text-[11px] uppercase tracking-[0.16em] lg:flex">
          <a href="#what" className="hover:opacity-70">What it does</a>
          <a href="#screens" className="hover:opacity-70">Screens</a>
          <a href="#proof" className="hover:opacity-70">Proof</a>
        </nav>
        <div className="hidden md:block"><SettingsMenu /></div>
        <SoundToggle dark={!overLight} className="!px-2 !text-current" />
        {hasSession ? (
          <Link href="/app" className="rounded-full border border-violet-300/60 bg-gradient-to-b from-white/30 to-violet-400/30 px-4 py-2 text-sm backdrop-blur hover:to-violet-400/50">Open workspace ↳</Link>
        ) : (
          <DemoForm className="rounded-full border border-violet-300/60 bg-gradient-to-b from-white/30 to-violet-400/30 px-4 py-2 text-sm backdrop-blur hover:to-violet-400/50">Try the demo ↳</DemoForm>
        )}
      </div>
    </header>
  );
}

const SERVICES = [
  "Brand Rulebook with page citations", "Facts Ledger with expiry dates", "24 rule-based detectors", "Grounded AI review",
  "Evidence-or-silence verifier", "Fix Studio with intent lock", "Role-based approvals", "Guideline Health insights",
  "Privacy masking before any AI call", "Hash-chained audit log",
];

const SCREENS = [
  { img: "/landing/review.png", tags: "Rules / AI / Verifier", name: "Review & fix", meta: "Scrn /01", w: "w-[46%]", mt: "mt-0", ml: "ml-[30%]" },
  { img: "/landing/verified.png", tags: "Approvals / Audit", name: "Brandrail Verified", meta: "Scrn /02", w: "w-[34%]", mt: "mt-10", ml: "ml-0" },
  { img: "/landing/insights.png", tags: "Analytics / Guideline health", name: "Insights", meta: "Scrn /03", w: "w-[40%]", mt: "-mt-24", ml: "ml-[56%]" },
  { img: "/landing/rulebook.png", tags: "Rule compiler / Versions", name: "Rulebook", meta: "Scrn /04", w: "w-[36%]", mt: "mt-12", ml: "ml-[8%]" },
  { img: "/landing/dashboard.png", tags: "Workflow / Activity", name: "Dashboard", meta: "Scrn /05", w: "w-[42%]", mt: "-mt-36", ml: "ml-[52%]" },
];

const PROOF = [
  { group: "Evaluation", count: "44", rows: [["Precision, rule-based checks", "100%"], ["Recall with the AI review", "100%"], ["Blocker recall", "100%"], ["False flags on clean controls", "0"], ["Citation validity", "100%"]] },
  { group: "Product", count: "29", rows: [["Rules with page citations", "29"], ["Deterministic detectors", "24"], ["Facts with expiry dates", "13"], ["Review roles", "4"]] },
  { group: "Running cost", count: "₹0", rows: [["Hosting (Vercel Hobby)", "₹0"], ["Database (Neon free)", "₹0"], ["AI review (Gemini free tier)", "₹0"]] },
];

function Inner({ hasSession, showGate, aiNote, expired }: Props) {
  const { theme, quality } = useLanding();
  const [activeGroup, setActiveGroup] = useState(0);
  const vars = (theme === "night" ? NIGHT : DAY) as React.CSSProperties;

  return (
    <main id="top" className="relative min-h-screen bg-[var(--l-bg)] text-white" style={vars}>
      <SmoothScroll />
      {showGate && <IntroGate />}
      <AmbientWhileMounted />
      <World theme={theme} quality={quality} containerId="world" sections={5} />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
      <Header hasSession={hasSession} />

      {/* ------------------------------------------------ world sections */}
      <div id="world" className="relative z-10">
        <section className="relative flex h-screen flex-col justify-end px-5 pb-10 sm:px-12">
          <Caption className="mb-14 drop-shadow">Pre-publication brand governance<br />for the brands of tomorrow</Caption>
          {expired && <p className="mb-4 text-sm text-amber-200">Your sandbox wasn&apos;t found. Start a new one from the top right.</p>}
          <div className="grid grid-cols-1 items-start gap-x-[6vw] sm:grid-cols-[auto_1fr]">
            <Reveal className={BIG} as="div"><span className="normal-case italic" style={BIG_SIZE}>Where</span></Reveal>
            <div className="sm:mt-[0.55em]" style={BIG_SIZE}>
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
            <Reveal className={BIG} delay={80}><Arrow className="mr-[0.9em]" /> more than</Reveal>
            <Reveal className={BIG} delay={160}>spelling and</Reveal>
            <Reveal className={BIG} delay={240}>style</Reveal>
          </div>
          <Caption className="mt-10">Tone, terms, facts, claims, visuals and accessibility, against your own rulebook</Caption>
        </section>

        <section className="relative flex h-screen flex-col justify-end px-5 pb-10 sm:px-12">
          <Pill>Evidence</Pill>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
            <div style={BIG_SIZE}>
              <Reveal className={BIG}>No source</Reveal>
              <Reveal className={BIG} delay={100}><Arrow className="mr-[0.9em]" /> no flag</Reveal>
            </div>
            <Caption className="mb-3 mr-[8vw]">Every flag quotes the text and cites a rule or an approved fact. A verifier drops the rest</Caption>
          </div>
        </section>

        <section className="relative flex h-screen flex-col items-end justify-center px-5 sm:px-12">
          <div className="w-full max-w-[44vw] min-w-[300px]">
            <Pill>Fixes</Pill>
            <div className="mt-6" style={BIG_SIZE}>
              <Reveal className={BIG}>Rewrites <span className="normal-case italic">With</span></Reveal>
              <Reveal className={BIG} delay={100}>an intent</Reveal>
            </div>
            <Caption className="mt-8">Suggestions keep the creator&apos;s goal, message and call to action, and are re-checked before you see them</Caption>
          </div>
        </section>

        <section className="relative flex h-screen flex-col justify-end px-5 pb-10 sm:px-12">
          <Pill>People</Pill>
          <Caption className="mt-8">AI suggests.<br />People decide.</Caption>
          <div className="mt-10 grid grid-cols-1 items-start gap-x-[10vw] sm:grid-cols-[auto_1fr]">
            <Reveal className={BIG}><span style={BIG_SIZE}><span className="normal-case italic">We</span> <Arrow /></span></Reveal>
            <div className="sm:mt-[0.55em]" style={BIG_SIZE}>
              <Reveal className={BIG} delay={80}>keep people in</Reveal>
              <Reveal className={BIG} delay={160}>charge of every</Reveal>
              <Reveal className={BIG} delay={240}>decision</Reveal>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------ light sections with the smoke cursor */}
      <div id="light" className="relative bg-[var(--l-bg)] text-[var(--l-ink)] transition-colors duration-500">
        <SmokeCursor activeId="light" dark={theme === "night"} />
        <div className="relative z-20">
          <section id="what" className="px-5 pb-28 pt-28 sm:px-12">
            <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
              <div>
                <div className="flex items-start gap-[8vw]">
                  <Pill>What it does</Pill>
                </div>
                <ScrollFillText
                  className="mt-6 font-serif text-[clamp(30px,3.4vw,54px)] leading-[1.08]"
                  text="↳ Brandrail turns brand guidelines into a living rulebook and checks every word, image and claim before it goes out, from social posts to launch emails. Every flag cites its source, every fix keeps the creator's intent, and people make the final call."
                />
                <DemoForm className="mt-10 inline-flex items-center gap-2 rounded-full border border-violet-500/50 bg-gradient-to-b from-white/60 to-violet-300/50 px-6 py-3 text-[15px] text-[#3b1a74] shadow-[0_10px_40px_-14px_rgba(124,58,237,0.7)] transition hover:to-violet-300/80">
                  Open the live demo <ArrowRight size={16} />
                </DemoForm>
              </div>
              <ol className="self-end border-t border-[var(--l-line)]">
                {SERVICES.map((s, i) => (
                  <li key={s} className="group flex items-baseline gap-4 border-b border-[var(--l-line)] py-3 transition hover:pl-2">
                    <span className="font-mono text-[11px] text-[var(--l-muted)]">({String(i + 1).padStart(3, "0")})</span>
                    <span className="font-serif text-[clamp(20px,1.7vw,28px)] leading-tight">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="screens" className="px-5 pb-32 sm:px-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className={BIG} style={BIG_SIZE}>
                Some <span className="normal-case italic">Of</span> the <MoveRight className="inline h-[0.5em] w-[0.9em]" strokeWidth={1} /><br />screens
              </h2>
              <Caption className="mb-3">A look inside the live product, from first draft to verified record</Caption>
            </div>
            <div className="relative mt-16 hidden md:block">
              {SCREENS.map((s) => (
                <a key={s.name} href="#" onClick={(e) => e.preventDefault()} className={clsx("group block", s.w, s.mt, s.ml)}>
                  <div className="overflow-hidden rounded-[22px] bg-black/5 shadow-[0_30px_60px_-30px_rgba(42,22,71,0.5)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.img} alt={`${s.name} screen`} className="block w-full transition duration-700 group-hover:scale-[1.04] group-hover:saturate-150" />
                  </div>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--l-muted)]">{s.meta} · {s.tags}</div>
                  <div className="font-serif text-[30px] leading-tight">{s.name}</div>
                </a>
              ))}
            </div>
            <div className="mt-10 grid gap-8 md:hidden">
              {SCREENS.map((s) => (
                <div key={s.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt={`${s.name} screen`} className="block w-full rounded-2xl" />
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--l-muted)]">{s.tags}</div>
                  <div className="font-serif text-2xl">{s.name}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="proof" className="px-5 pb-32 sm:px-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className={BIG} style={BIG_SIZE}>Proof &amp;<br />numbers</h2>
              <Caption className="mb-3">Measured on a 44-sample labelled test set and tested end to end on the live site</Caption>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-white">» Caught: 58/58</span>
            </div>
            <div className="relative mt-10 border-t border-[var(--l-ink)]/80">
              <div className="pointer-events-none absolute left-[22%] top-6 hidden h-64 w-56 lg:block"><Badge3D className="h-full w-full" /></div>
              {PROOF.map((g, gi) => (
                <div
                  key={g.group}
                  onMouseEnter={() => setActiveGroup(gi)}
                  className={clsx("grid grid-cols-1 border-b border-[var(--l-line)] transition-opacity duration-500 lg:grid-cols-2", activeGroup === gi ? "opacity-100" : "opacity-40")}
                >
                  <div className="py-4 text-xl uppercase tracking-tight">{g.group} <sup className="font-mono text-[10px]">[{g.count}]</sup></div>
                  <ul>
                    {g.rows.map(([k, v]) => (
                      <li key={k} className="flex items-baseline justify-between border-b border-[var(--l-line)] py-3 last:border-b-0">
                        <span className="font-serif text-[clamp(20px,1.6vw,26px)]">{k}</span>
                        <span className="font-mono text-xs">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <footer className="px-5 pb-10 sm:px-12">
            <div className="border-t border-[var(--l-line)] pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--l-muted)]">Try it now</span>
              <div className="mt-6" style={BIG_SIZE}>
                <div className={BIG}><span className="normal-case italic">Let&apos;s</span> check</div>
                <div className={BIG}><Arrow className="mr-[0.9em]" /> something real</div>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-8">
                <DemoForm className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-7 py-3.5 text-[15px] text-white shadow-[0_12px_40px_-12px_rgba(124,58,237,0.8)] transition hover:bg-violet-700">
                  Open the live demo <ArrowRight size={16} />
                </DemoForm>
                <Caption>Have a post, an email or a campaign? Run it through the rails</Caption>
              </div>
              <div className="mt-20 grid gap-10 font-mono text-[11px] uppercase tracking-[0.12em] sm:grid-cols-2 lg:grid-cols-4">
                <div><div className="text-[var(--l-muted)]">Links</div><ul className="mt-3 space-y-1.5"><li><a href="/app">[01] Live demo</a></li><li><a href="https://github.com/n1h4r1k4/brandrail">[02] GitHub</a></li><li><a href="https://github.com/n1h4r1k4/brandrail#readme">[03] README</a></li></ul></div>
                <div><div className="text-[var(--l-muted)]">Pages</div><ul className="mt-3 space-y-1.5"><li><a href="#what">[01] What it does</a></li><li><a href="#screens">[02] Screens</a></li><li><a href="#proof">[03] Proof</a></li></ul></div>
                <div><div className="text-[var(--l-muted)]">Built for</div><p className="mt-3 leading-relaxed">Inkloom AI problem statement<br />We Code Coders hackathon, 2026</p></div>
                <div><div className="text-[var(--l-muted)]">Team</div><p className="mt-3 leading-relaxed">Caffiene Addict<br />Solo build</p></div>
              </div>
              <div className="mt-16 flex flex-wrap justify-between gap-3 border-t border-[var(--l-line)] pb-2 pr-20 pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--l-muted)]">
                <span>© 2026 Brandrail · Demo data is fictional</span>
                <span>{aiNote}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <GuideOrb />
    </main>
  );
}
