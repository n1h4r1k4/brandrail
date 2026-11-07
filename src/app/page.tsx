import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarClock, CheckCircle2, FileSearch, GitPullRequestArrow, ShieldCheck, Sparkles } from "lucide-react";
import { getSession } from "@/lib/session";
import { aiEnabled, REVIEW_MODEL } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export default async function Landing({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const [session, sp] = await Promise.all([getSession().catch(() => null), searchParams]);
  const ai = aiEnabled();
  return (
    <main className="min-h-screen bg-[#0b1224] text-slate-200">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="font-display text-lg font-bold text-white">
            Brand<span className="text-indigo-400">rail</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-medium ${ai ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
              {ai ? `AI checks on · ${REVIEW_MODEL}` : "AI checks off · rule-based checks only"}
            </span>
            <a href="https://github.com/n1h4r1k4/brandrail" className="text-slate-400 hover:text-white">GitHub</a>
          </div>
        </header>

        <section className="grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-indigo-300">PRE-PUBLICATION BRAND GOVERNANCE</p>
            <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Guardrails,<br />not gatekeepers.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Brandrail checks every word, image and claim against your approved guidelines and facts <em>before</em> it goes out.
              Every flag cites its source. Every fix keeps the creator&apos;s intent. A person always makes the final call.
            </p>
            {sp.expired && <p className="mt-4 text-sm text-amber-300">Your sandbox wasn&apos;t found. Start a new one below.</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <form action="/api/demo" method="post">
                <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400">
                  {session ? "Start a fresh sandbox" : "Open the demo workspace"} <ArrowRight size={18} />
                </button>
              </form>
              {session && (
                <Link href="/app" className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-5 py-3 font-semibold text-white hover:bg-white/5">
                  Continue where you left off
                </Link>
              )}
            </div>
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-400">
              No sign-up. Each visitor gets a private sandbox with a fictional brand, <strong className="text-slate-300">Nimbus Pay</strong> (an
              Indian payments app): a 30-rule rulebook, a Facts Ledger with expiry dates and some review history. Switch between four personas
              (creator, brand reviewer, compliance, brand admin) from the top bar.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-white/[0.03] p-6">
            <p className="font-mono text-xs tracking-[0.14em] text-indigo-300">TRY IT IN 3 MINUTES</p>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                ["New content → load the “Diwali cashback post” sample → Check.", "See cited findings: an expired offer, an unsupported superlative, low-contrast CTA text."],
                ["Accept a suggested fix, dispute a tone flag with a reason.", "Each accept creates a new version and re-checks instantly."],
                ["Submit, then switch persona to the brand reviewer and Compliance.", "Override with a reason, request changes or approve. Approval locks a verified record."],
                ["Open Insights and the Audit log.", "Guideline Health shows which rules people keep disputing. The audit chain can be verified."],
              ].map(([a, b], i) => (
                <li key={i} className="grid grid-cols-[24px_1fr] gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">{i + 1}</span>
                  <span><span className="font-medium text-white">{a}</span><br /><span className="text-slate-400">{b}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-4 pb-14 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [BookOpenCheck, "Guidelines become code", "Brand books compile into versioned rules with page citations. Every check is pinned to a rulebook version."],
            [CalendarClock, "Facts with expiry dates", "Offers, rates and stats live in a Facts Ledger with owners and valid-until dates. Outdated claims are caught automatically."],
            [ShieldCheck, "Evidence or silence", "AI findings must quote the text and cite a real rule or fact. A verifier drops anything it can't trace."],
            [Sparkles, "Fixes that keep intent", "Suggestions are minimal rewrites, re-checked so they don't introduce new problems or drop the call to action."],
            [GitPullRequestArrow, "Humans decide", "Role-based review, overrides only with a reason, version diffs and a hash-chained audit log."],
            [FileSearch, "Guidelines that debug themselves", "Disputes and overrides show the brand team which rules are unclear or too strict."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof BookOpenCheck;
            return (
              <div key={t as string} className="rounded-xl border border-slate-700/70 bg-white/[0.02] p-5">
                <I size={20} className="text-indigo-300" />
                <h3 className="mt-3 font-display text-base font-semibold text-white">{t as string}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{d as string}</p>
              </div>
            );
          })}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 py-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Built for the Inkloom AI problem statement, We Code Coders hackathon. Demo data is fictional.
          </span>
          <span>AI: Anthropic Claude API, used only after masking confidential terms and personal data.</span>
        </footer>
      </div>
    </main>
  );
}
