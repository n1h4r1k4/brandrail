import clsx from "clsx";
import type { ContentStatus, FindingStatus, Severity } from "@/lib/db/schema";
import { STATUS_LABEL } from "@/lib/workflow";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-2xl border border-line/80 bg-white shadow-soft", className)}>{children}</div>;
}

/** Brandrail mark: two rails converging on a check, inside a rounded square. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="br-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#br-g)" />
      <path d="M9 23 L14 9 M23 23 L18 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      <path d="M10.5 17.5 l3.5 3.5 l7.5 -8" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={clsx("font-display text-lg font-bold tracking-tight", dark ? "text-white" : "text-ink")}>
        Brand<span className={dark ? "text-indigo-300" : "text-accent"}>rail</span>
      </span>
    </span>
  );
}

const AVATAR_TONES: Record<string, string> = {
  creator: "from-amber-400 to-orange-500",
  reviewer: "from-indigo-400 to-indigo-600",
  compliance: "from-teal-400 to-teal-600",
  admin: "from-fuchsia-400 to-violet-600",
};

export function Avatar({ name, role, size = 32 }: { name: string; role: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white", AVATAR_TONES[role] ?? "from-slate-400 to-slate-600")}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/** Circular score gauge (0-100). */
export function ScoreRing({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 85 ? "#047857" : value >= 60 ? "#b45309" : "#c62828";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label ?? "Score"}: ${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef0f7" strokeWidth="7" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <span className="absolute font-display text-lg font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export function Tag({ tone = "grey", children, className }: { tone?: "grey" | "accent" | "teal" | "blocker" | "major" | "minor" | "ok"; children: React.ReactNode; className?: string }) {
  const tones = {
    grey: "bg-soft text-muted",
    accent: "bg-accent-soft text-accent",
    teal: "bg-teal-soft text-teal",
    blocker: "bg-blocker-soft text-blocker",
    major: "bg-major-soft text-major",
    minor: "bg-minor-soft text-minor",
    ok: "bg-ok-soft text-ok",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  return <Tag tone={severity}>{severity.toUpperCase()}</Tag>;
}

export function StatusTag({ status }: { status: ContentStatus }) {
  const tone = status === "approved" ? "ok" : status === "in_review" ? "accent" : status === "changes_requested" ? "major" : "grey";
  return <Tag tone={tone}>{STATUS_LABEL[status]}</Tag>;
}

export function FindingStatusTag({ status }: { status: FindingStatus }) {
  const map: Record<FindingStatus, [string, "grey" | "ok" | "major" | "accent" | "teal"]> = {
    open: ["Open", "grey"],
    accepted: ["Fix applied", "ok"],
    disputed: ["Disputed", "major"],
    overridden: ["Overridden", "accent"],
    resolved: ["Resolved", "ok"],
  };
  const [label, tone] = map[status];
  return <Tag tone={tone}>{label}</Tag>;
}

export function Button({
  variant = "primary", size = "md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "ok"; size?: "sm" | "md" }) {
  const v = {
    primary: "bg-accent text-white hover:bg-accent-2 border-accent",
    secondary: "bg-white text-ink border-line hover:bg-soft",
    ghost: "bg-transparent text-ink border-transparent hover:bg-soft",
    danger: "bg-white text-blocker border-blocker/40 hover:bg-blocker-soft",
    ok: "bg-ok text-white border-ok hover:bg-emerald-800",
  }[variant];
  const s = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  return (
    <button
      {...props}
      className={clsx("inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-50", v, s, className)}
    />
  );
}

export function Kpi({ label, value, hint, tone, icon }: { label: string; value: React.ReactNode; hint?: string; tone?: "accent" | "ok" | "major" | "blocker"; icon?: React.ReactNode }) {
  const color = tone === "ok" ? "text-ok" : tone === "major" ? "text-major" : tone === "blocker" ? "text-blocker" : "text-accent";
  const tint = tone === "ok" ? "bg-ok-soft" : tone === "major" ? "bg-major-soft" : tone === "blocker" ? "bg-blocker-soft" : "bg-accent-soft";
  return (
    <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-muted">{label}</div>
        {icon && <span className={clsx("inline-flex h-8 w-8 items-center justify-center rounded-lg", tint, color)}>{icon}</span>}
      </div>
      <div className={clsx("mt-1 font-display text-3xl font-bold tracking-tight", color)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="mt-1 max-w-3xl text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={clsx("font-mono text-[0.85em]", className)}>{children}</span>;
}

export function timeAgo(d: Date | string) {
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.round((Date.now() - t.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const days = Math.round(s / 86400);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
