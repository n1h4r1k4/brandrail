import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight, BarChart3, BookOpenCheck, CalendarClock, ClipboardCheck, CornerDownRight, CornerRightDown, FileSearch, GitPullRequestArrow,
  ScanText, ShieldCheck, Sparkles, Upload,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { activeProvider, providerLabel, providerName } from "@/lib/ai/client";
import { Logo } from "@/components/ui";
import { HeroVisual } from "@/components/graphics";
import { RailsScene } from "@/components/rails-scene";
import { IntroGate } from "@/components/intro-gate";
import { AmbientWhileMounted, SoundToggle } from "@/components/sound";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: BookOpenCheck, tone: "from-indigo-500 to-violet-500", title: "Guidelines become code", body: "Brand books compile into versioned rules with page citations. Every check is pinned to a rulebook version." },
  { icon: CalendarClock, tone: "from-amber-500 to-orange-500", title: "Facts with expiry dates", body: "Offers, rates and stats live in a Facts Ledger with owners and valid-until dates. Outdated claims are caught automatically." },
  { icon: ShieldCheck, tone: "from-teal-500 to-emerald-500", title: "Evidence or silence", body: "AI findings must quote the text and cite a real rule or fact. A verifier drops anything it can't trace." },
  { icon: Sparkles, tone: "from-fuchsia-500 to-pink-500", title: "Fixes that keep intent", body: "Suggestions are minimal rewrites, re-checked so they don't add new problems or drop the call to action." },
  { icon: GitPullRequestArrow, tone: "from-sky-500 to-indigo-500", title: "Humans decide", body: "Role-based review, overrides only with a reason, version diffs and a hash-chained audit log." },
  { icon: FileSearch, tone: "from-rose-500 to-orange-500", title: "Guidelines that debug themselves", body: "Disputes and overrides show the brand team which rules are unclear or too strict." },
];

const STEPS = [
  { icon: Upload, title: "Set up", body: "Rules from the brand book, facts with expiry dates, roles." },
  { icon: ScanText, title: "Check", body: "Text, documents and images checked in seconds, every flag cited." },
  { icon: ClipboardCheck, title: "Review", body: "Accept fixes or dispute; reviewers override with reasons and approve." },
  { icon: BarChart3, title: "Learn", body: "Recurring mistakes and unclear rules surface for the brand team." },
];

function DemoButton({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <form action="/api/demo" method="post">
      <button
        className={
          light
            ? "group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-indigo-700 transition hover:bg-indigo-50"
            : "group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-indigo-300/40 bg-indigo-500/20 px-6 py-3 font-medium text-white shadow-[0_0_40px_-10px_rgba(129,140,248,0.8)] backdrop-blur transition hover:bg-indigo-500/30"
        }
      >
        {!light && <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition duration-700 group-hover:translate-x-full" />}
        {label} <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}

export default async function Landing({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const [session, sp, jar] = await Promise.all([getSession().catch(() => null), searchParams, cookies()]);
  const ai = activeProvider();
  const showGate = !jar.get("br_gate");

  return (
    <main className="relative min-h-screen bg-[#07061a] text-slate-300">
      <RailsScene className="fixed inset-0 z-0" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_top,rgba(7,6,26,0.95)_0%,rgba(7,6,26,0.25)_45%,rgba(7,6,26,0.45)_100%)]" />
      {showGate && <IntroGate />}
      <AmbientWhileMounted />

      <div className="relative z-10">
        <header className="fixed inset-x-0 top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-10">
            <Logo dark />
            <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300 md:flex">
              <a href="#why" className="hover:text-white">Why</a>
              <a href="#product" className="hover:text-white">Product</a>
              <a href="#how" className="hover:text-white">How it works</a>
              <a href="https://github.com/n1h4r1k4/brandrail" className="hover:text-white">GitHub</a>
            </nav>
            <div className="flex items-center gap-2">
              <SoundToggle dark />
              {session ? (
                <Link href="/app" className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/10">Open workspace ↳</Link>
              ) : (
                <form action="/api/demo" method="post"><button className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/10">Live demo ↳</button></form>
              )}
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-5 pb-14 pt-32 sm:px-10">
          <p className="text-shade reveal max-w-sm font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-slate-300 [animation-delay:200ms]">
            Hi. We&apos;re Brandrail, the review layer for every word, image and claim a brand publishes.
          </p>
          <h1 className="drop-shade mt-6 font-serif uppercase leading-[0.86] tracking-[-0.01em] text-white" style={{ fontSize: "clamp(52px, 8.6vw, 136px)" }}>
            <span className="reveal block text-silver [animation-delay:300ms]">Brands aren&apos;t broken</span>
            <span className="reveal flex items-end gap-4 text-silver [animation-delay:420ms]">
              by big ideas <CornerRightDown className="mb-[0.18em] h-[0.42em] w-[0.42em] shrink-0 text-indigo-300" strokeWidth={1.25} />
            </span>
            <span className="reveal flex items-end gap-4 pl-[8vw] text-silver [animation-delay:540ms]">
              <CornerDownRight className="mb-[0.18em] h-[0.42em] w-[0.42em] shrink-0 text-indigo-300" strokeWidth={1.25} /> they&apos;re broken by
            </span>
            <span className="reveal block pl-[3vw] [animation-delay:660ms]">
              <span className="text-silver">unchecked </span>
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-teal-300 bg-clip-text normal-case italic text-transparent">details</span>
            </span>
          </h1>
          {sp.expired && <p className="mt-4 text-sm text-amber-300">Your sandbox wasn&apos;t found. Start a new one below.</p>}
          <div className="reveal mt-10 flex flex-wrap items-center gap-5 [animation-delay:820ms]">
            <DemoButton label={session ? "Start a fresh sandbox" : "Open the live demo"} />
            {session && <Link href="/app" className="border-b border-slate-500 pb-0.5 text-sm text-slate-200 hover:border-white hover:text-white">Continue where you left off</Link>}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Scroll to ride the rails ↓</span>
          </div>
        </section>

        {/* WHY */}
        <section id="why" className="mx-auto flex min-h-[95vh] max-w-6xl flex-col items-center justify-center px-5 text-center sm:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">Guardrails, not gatekeepers</p>
          <h2 className="drop-shade mt-6 font-serif uppercase leading-[0.9] text-white" style={{ fontSize: "clamp(40px, 6.4vw, 104px)" }}>
            <span className="block text-silver">A review layer that</span>
            <span className="block text-silver">cites every flag &amp;</span>
            <span className="flex items-end justify-center gap-4">
              <CornerDownRight className="mb-[0.16em] h-[0.42em] w-[0.42em] text-indigo-300" strokeWidth={1.25} />
              <span className="text-silver">keeps people in</span>{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-teal-300 bg-clip-text normal-case italic text-transparent">charge</span>
            </span>
          </h2>
          <p className="text-shade mt-8 max-w-xl text-lg leading-relaxed text-slate-200">
            Every word, image and claim is checked against your approved guidelines and facts <em className="text-white">before</em> it goes out.
            Every fix keeps the creator&apos;s intent. A person always makes the final call.
          </p>
          <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 text-left sm:grid-cols-4">
            {[
              ["29", "brand rules, each citing its source page"],
              ["13", "approved facts with expiry dates"],
              ["100%", "precision on our 44-sample test set"],
              ["0", "false flags on 12 clean control samples"],
            ].map(([n, l]) => (
              <div key={l} className="bg-[#0b0a24]/80 px-5 py-5 backdrop-blur">
                <div className="font-serif text-5xl text-white">{n}</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PRODUCT */}
        <section id="product" className="mx-auto max-w-7xl px-5 py-24 sm:px-10">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">The product</p>
              <h2 className="mt-4 font-serif text-5xl uppercase leading-[0.92] text-silver sm:text-6xl">Flagged in,<br /><span className="normal-case italic text-teal-300">verified</span> out</h2>
              <p className="text-shade mt-6 max-w-md leading-relaxed text-slate-200">
                Rule-based checks catch what must be exact: names, figures, expired offers, missing disclaimers, contrast. A grounded AI review handles tone,
                messaging and implied claims, and a verifier drops anything it can&apos;t trace to a rule or an approved fact.
              </p>
              <ul className="text-shade mt-6 space-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-300">
                <li>↳ Every flag cites its rule and page</li>
                <li>↳ Fixes re-checked before you see them</li>
                <li>↳ Locked, hashed, approved by people</li>
              </ul>
            </div>
            <div className="px-2 sm:px-6"><HeroVisual /></div>
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="mx-auto max-w-7xl px-5 py-24 sm:px-10">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">How it works</p>
          <h2 className="mt-4 text-center font-serif text-5xl uppercase leading-[0.92] text-silver sm:text-6xl">From draft to <span className="normal-case italic text-teal-300">verified</span></h2>
          <div className="relative mt-12 grid gap-4 md:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="glass relative rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40"><Icon size={20} /></span>
                  <span className="font-mono text-xs text-slate-500">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-serif text-3xl text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, tone, title, body }) => (
              <div key={title} className="glass group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-white/20">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-lg`}><Icon size={20} /></span>
                <h3 className="mt-4 font-serif text-[28px] leading-tight text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TRY */}
        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-10">
          <div className="glass overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-600/30 via-violet-600/15 to-teal-500/15 p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <h2 className="font-serif text-5xl uppercase leading-[0.92] text-white sm:text-6xl">Try it in <span className="normal-case italic text-indigo-200">three</span> minutes</h2>
                <p className="mt-4 text-sm text-slate-300">No sign-up. A private sandbox with a fictional brand, Nimbus Pay, and four personas: creator, brand reviewer, compliance, brand admin.</p>
                <div className="mt-7"><DemoButton label="Open the live demo" light /></div>
              </div>
              <ol className="space-y-3 text-sm">
                {[
                  ["New content → load the “Diwali cashback post” sample → Check.", "Cited findings: an expired offer, an unsupported superlative, low-contrast CTA text."],
                  ["Accept a fix, dispute a tone flag with a reason.", "Each accept creates a new version and re-checks instantly."],
                  ["Submit, then switch persona to the brand reviewer and Compliance.", "Override with a reason or request changes, then approve to lock a verified record."],
                  ["Open Insights and the Audit log.", "Guideline Health shows which rules people keep disputing; the audit chain verifies."],
                ].map(([a, b], i) => (
                  <li key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-[#0b0a24]/70 p-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">{i + 1}</span>
                    <span><span className="font-medium text-white">{a}</span><br /><span className="text-slate-400">{b}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-8 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:px-10">
          <span>Inkloom AI problem statement · We Code Coders · Demo data is fictional</span>
          <span>{ai === "none" ? "AI review off on this deployment" : `AI: ${providerName()} (${providerLabel().split(" · ")[1]}) · masked before sending`}</span>
        </footer>
      </div>
    </main>
  );
}
