// Decorative and explanatory graphics. All inline SVG/CSS, no external assets.
import clsx from "clsx";
import { ArrowRight, Bot, EyeOff, ListChecks, ShieldCheck, UserCheck } from "lucide-react";

/** Landing hero: product preview with a scanning beam and floating finding chips. */
export function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-tr from-indigo-500/30 via-violet-500/10 to-teal-400/30 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-[11px] text-slate-500">brandrail · Diwali cashback post</span>
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/review.png" alt="Brandrail review screen: highlighted text and cited findings with suggested fixes" className="block w-full" />
          <div className="scan-beam pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-indigo-400/25 to-transparent">
            <div className="absolute inset-x-0 top-1/2 h-px bg-indigo-300/80 shadow-[0_0_12px_2px_rgba(129,140,248,0.8)]" />
          </div>
        </div>
      </div>

      <div className="float-a pop-in absolute -left-6 top-16 hidden w-60 rounded-xl border border-rose-400/30 bg-[#1a0f1a]/90 p-3 text-xs shadow-xl backdrop-blur sm:block [animation-delay:300ms]">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">BLOCKER</span>
          <span className="font-semibold text-white">Expired offer</span>
        </div>
        <div className="mt-1 text-slate-300">“5% cashback till 31 Oct” · F-037 superseded</div>
        <div className="mt-1.5 rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-200">Fix: “3% cashback till 30 Nov”</div>
      </div>

      <div className="float-b pop-in absolute -right-4 top-1/2 hidden w-56 rounded-xl border border-indigo-400/30 bg-[#0f1230]/90 p-3 text-xs shadow-xl backdrop-blur sm:block [animation-delay:600ms]">
        <div className="flex items-center gap-1.5 font-semibold text-white"><ShieldCheck size={14} className="text-indigo-300" /> Verifier</div>
        <div className="mt-1.5 space-y-1 text-slate-300">
          <div className="flex justify-between"><span>quote found</span><span className="text-emerald-300">✓</span></div>
          <div className="flex justify-between"><span>rule exists</span><span className="text-emerald-300">✓</span></div>
          <div className="flex justify-between"><span>fix adds no new issue</span><span className="text-emerald-300">✓</span></div>
        </div>
      </div>

      <div className="float-c pop-in absolute -bottom-6 left-10 hidden items-center gap-3 rounded-xl border border-emerald-400/30 bg-[#06201b]/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur sm:flex [animation-delay:900ms]">
        <VerifiedSeal size={40} />
        <div>
          <div className="font-semibold text-white">Brandrail Verified</div>
          <div className="font-mono text-[10px] text-emerald-200/80">sha256 6d56e984812c…</div>
        </div>
      </div>
    </div>
  );
}

/** A circular seal with text on a path and a check in the middle. */
export function VerifiedSeal({ size = 64, className }: { size?: number; className?: string }) {
  const id = `seal-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <path id={id} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id}-g)`} />
      <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 3" />
      <g className="spin-slower">
        <text fontSize="9.5" fontWeight="700" letterSpacing="2.2" fill="white" fillOpacity="0.92">
          <textPath href={`#${id}`}>BRANDRAIL · VERIFIED · BRANDRAIL · VERIFIED ·</textPath>
        </text>
      </g>
      <circle cx="50" cy="50" r="20" fill="white" />
      <path d="M41 50.5 l6 6 l12 -13" stroke="#047857" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Dashboard hero decoration: orbits around a shield. */
export function ShieldOrbit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#a5b4fc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a5b4fc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="160" r="150" fill="url(#orb-glow)" />
      <g className="spin-slow">
        <circle cx="160" cy="160" r="120" fill="none" stroke="white" strokeOpacity="0.18" strokeDasharray="3 7" />
        <circle cx="280" cy="160" r="6" fill="#5eead4" />
        <circle cx="60" cy="90" r="4" fill="#fde68a" />
      </g>
      <g className="spin-slower">
        <circle cx="160" cy="160" r="85" fill="none" stroke="white" strokeOpacity="0.25" />
        <circle cx="160" cy="75" r="5" fill="#f9a8d4" />
        <circle cx="100" cy="220" r="4" fill="#c4b5fd" />
      </g>
      <circle cx="160" cy="160" r="46" fill="white" fillOpacity="0.12" className="pulse-ring" />
      <path d="M160 118 l34 13 v24 c0 22 -15 38 -34 46 c-19 -8 -34 -24 -34 -46 v-24 z" fill="white" fillOpacity="0.95" />
      <path d="M145 158 l10 10 l21 -23" stroke="#4338ca" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Animated connector for the "How it works" steps. */
export function FlowLine() {
  return (
    <svg className="pointer-events-none absolute left-[12%] right-[12%] top-[38px] hidden h-4 md:block" preserveAspectRatio="none" viewBox="0 0 100 4" aria-hidden="true">
      <line x1="0" y1="2" x2="100" y2="2" stroke="#6366f1" strokeOpacity="0.25" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="2" x2="100" y2="2" stroke="#a5b4fc" strokeWidth="2" vectorEffect="non-scaling-stroke" className="dash-flow" />
    </svg>
  );
}

/** "How this was checked" as a pipeline: rules → privacy → AI → verifier → people. */
export function CheckPipeline({
  rules, ruleFindings, masked, ai, proposed, kept, dropped,
}: { rules: number; ruleFindings: number; masked: number; ai: "on" | "off" | "skipped" | "error"; proposed: number; kept: number; dropped: number }) {
  const aiOff = ai !== "on";
  const stages = [
    { icon: ListChecks, label: "Rules", value: `${ruleFindings}`, sub: `${rules} rules run`, tone: "bg-teal-soft text-teal" },
    { icon: EyeOff, label: "Privacy mask", value: `${masked}`, sub: "terms hidden", tone: "bg-soft text-ink-2" },
    { icon: Bot, label: "AI review", value: aiOff ? "–" : `${proposed}`, sub: aiOff ? (ai === "skipped" ? "carried over" : "not run") : "proposed", tone: "bg-accent-soft text-accent" },
    { icon: ShieldCheck, label: "Verifier", value: aiOff ? "–" : `${kept}`, sub: aiOff ? "–" : `kept · ${dropped} dropped`, tone: "bg-major-soft text-major" },
    { icon: UserCheck, label: "People", value: "You", sub: "decide", tone: "bg-ok-soft text-ok" },
  ];
  return (
    <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
      {stages.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex items-center gap-1">
            <div className={clsx("min-w-[86px] rounded-xl px-2.5 py-2 text-center", s.tone, aiOff && (i === 2 || i === 3) && "opacity-50")}>
              <Icon size={15} className="mx-auto" />
              <div className="mt-1 font-display text-lg font-bold leading-none">{s.value}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{s.label}</div>
              <div className="text-[10px] opacity-80">{s.sub}</div>
            </div>
            {i < stages.length - 1 && <ArrowRight size={14} className="shrink-0 text-muted" />}
          </div>
        );
      })}
    </div>
  );
}

const DONUT_COLORS = ["#4338ca", "#0f766e", "#c62828", "#b45309", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

/** Donut chart with a centre total. */
export function Donut({ data, size = 170 }: { data: { label: string; value: number }[]; size?: number }) {
  const total = data.reduce((n, d) => n + d.value, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Issues by category">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f7" strokeWidth="22" />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="22"
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="50%" y="49%" textAnchor="middle" fill="#0f172a" fontSize="28" fontWeight="700" style={{ fontFamily: "var(--font-display)" }}>{total}</text>
        <text x="50%" y="62%" textAnchor="middle" fill="#5b6474" fontSize="11">issues</text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-ink-2">{d.label}</span>
            <span className="font-mono text-xs text-muted">{d.value} · {Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
