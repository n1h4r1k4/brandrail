import clsx from "clsx";
import type { ContentStatus, FindingStatus, Severity } from "@/lib/db/schema";
import { STATUS_LABEL } from "@/lib/workflow";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-xl border border-line bg-white", className)}>{children}</div>;
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

export function Kpi({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "accent" | "ok" | "major" | "blocker" }) {
  const color = tone === "ok" ? "text-ok" : tone === "major" ? "text-major" : tone === "blocker" ? "text-blocker" : "text-accent";
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={clsx("mt-1 font-display text-2xl font-bold", color)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
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
