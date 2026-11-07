import Link from "next/link";
import {
  ArrowRight, BarChart3, BookOpenCheck, CalendarClock, ClipboardCheck, FileSearch, GitPullRequestArrow, ScanText, ShieldCheck, Sparkles, Upload,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { activeProvider, providerLabel, providerName } from "@/lib/ai/client";
import { Logo } from "@/components/ui";
import { FlowLine, HeroVisual } from "@/components/graphics";

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

export default async function Landing({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const [session, sp] = await Promise.all([getSession().catch(() => null), searchParams]);
  const ai = activeProvider();
  return (
    <main className="min-h-screen overflow-hidden bg-[#070b18] text-slate-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(900px_420px_at_20%_0%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(700px_380px_at_90%_20%,rgba(20,184,166,0.22),transparent_60%)]" />
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[720px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between py-6">
          <Logo dark />
          <div className="flex items-center gap-3 text-xs">
            <span className={`hidden rounded-full px-3 py-1 font-medium sm:inline ${ai !== "none" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
              {ai !== "none" ? `AI review on · ${providerLabel()}` : "AI review off · rule-based checks only"}
            </span>
            <a href="https://github.com/n1h4r1k4/brandrail" className="rounded-full border border-white/10 px-3 py-1 text-slate-300 hover:bg-white/5 hover:text-white">GitHub</a>
          </div>
        </header>

        <section className="grid items-center gap-12 pb-16 pt-10 lg:grid-cols-[1fr_1.1fr] lg:pt-16">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Pre-publication brand governance
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl">
              Guardrails,<br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-teal-300 bg-clip-text text-transparent">not gatekeepers.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Brandrail checks every word, image and claim against your approved guidelines and facts <em className="text-white">before</em> it goes out.
              Every flag cites its source. Every fix keeps the creator&apos;s intent. A person always makes the final call.
            </p>
            {sp.expired && <p className="mt-4 text-sm text-amber-300">Your sandbox wasn&apos;t found. Start a new one below.</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <form action="/api/demo" method="post">
                <button className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110">
                  {session ? "Start a fresh sandbox" : "Open the live demo"} <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                </button>
              </form>
              {session && (
                <Link href="/app" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold text-white hover:bg-white/10">
                  Continue where you left off
                </Link>
              )}
            </div>
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-400">
              No sign-up. You get a private sandbox with a fictional brand, <b className="text-slate-200">Nimbus Pay</b> (an Indian payments app),
              and four personas to switch between: creator, brand reviewer, compliance and brand admin.
            </p>
          </div>

          <div className="fade-up relative [animation-delay:120ms]">
            <HeroVisual />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
          {[
            ["29", "brand rules, each citing its source page"],
            ["13", "approved facts with expiry dates"],
            ["100%", "precision of rule-based checks on our 44-sample test set"],
            ["0", "false flags on 12 clean control samples"],
          ].map(([n, l]) => (
            <div key={l} className="bg-[#0b1224] px-5 py-5">
              <div className="font-display text-3xl font-bold text-white">{n}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-400">{l}</div>
            </div>
          ))}
        </section>

        <section className="py-20">
          <p className="text-center font-mono text-xs tracking-[0.2em] text-indigo-300">HOW IT WORKS</p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold text-white sm:text-4xl">From draft to verified, with people in charge</h2>
          <div className="relative mt-10 grid gap-4 md:grid-cols-4">
            <FlowLine />
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="relative rounded-2xl border border-white/10 bg-[#0b1224] p-5">
                <div className="flex items-center justify-between">
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40"><Icon size={20} /></span>
                  <span className="font-mono text-xs text-slate-500">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, tone, title, body }) => (
            <div key={title} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-lg`}><Icon size={20} /></span>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </section>

        <section className="mb-20 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-teal-500/20 p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-white">Try it in 3 minutes</h2>
              <p className="mt-2 text-sm text-slate-300">Everything below runs in your own sandbox. Nothing you do affects anyone else.</p>
              <form action="/api/demo" method="post" className="mt-6">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">
                  Open the live demo <ArrowRight size={17} />
                </button>
              </form>
            </div>
            <ol className="space-y-3 text-sm">
              {[
                ["New content → load the “Diwali cashback post” sample → Check.", "Cited findings: an expired offer, an unsupported superlative, low-contrast CTA text."],
                ["Accept a fix, dispute a tone flag with a reason.", "Each accept creates a new version and re-checks instantly."],
                ["Submit, then switch persona to the brand reviewer and Compliance.", "Override with a reason or request changes, then approve to lock a verified record."],
                ["Open Insights and the Audit log.", "Guideline Health shows which rules people keep disputing; the audit chain verifies."],
              ].map(([a, b], i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-white/10 bg-[#0b1224]/60 p-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">{i + 1}</span>
                  <span><span className="font-medium text-white">{a}</span><br /><span className="text-slate-400">{b}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-8 text-xs text-slate-500">
          <span>Built for the Inkloom AI problem statement · We Code Coders hackathon · Demo data is fictional.</span>
          <span>
            {ai === "none" ? "AI review is off on this deployment." : `AI: ${providerName()}, used only after masking confidential terms and personal data.`}
          </span>
        </footer>
      </div>
    </main>
  );
}
