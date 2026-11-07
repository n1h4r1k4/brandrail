"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// Sidebar in the landing page's style: numbered serif entries, mono section labels,
// and a lavender glass highlight for the current page.
const ITEMS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/new", label: "New content" },
  { href: "/app/review", label: "Review queue", badge: true },
  { href: "/app/rulebook", label: "Rulebook", section: "Brand kit" },
  { href: "/app/facts", label: "Facts Ledger" },
  { href: "/app/insights", label: "Insights", section: "Governance" },
  { href: "/app/audit", label: "Audit log" },
];

export function Nav({ queue, horizontal }: { queue: number; horizontal?: boolean }) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/app" ? path === "/app" : path.startsWith(href) || (href === "/app/new" && path.startsWith("/app/content"));

  if (horizontal) {
    return (
      <nav className="flex gap-1.5 overflow-x-auto">
        {ITEMS.map(({ href, label, badge }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-serif text-[15px] transition",
              isActive(href)
                ? "border border-violet-400/60 bg-gradient-to-b from-white/80 to-violet-200/70 text-[#2a1647] shadow-[0_6px_20px_-10px_rgba(124,58,237,0.6)]"
                : "text-[#6d5c93] hover:bg-white/60 hover:text-[#2a1647]",
            )}
          >
            {label}
            {badge && queue > 0 && <span className="rounded-full bg-violet-600 px-1.5 font-mono text-[10px] text-white">{queue}</span>}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="mt-6 flex flex-col">
      {ITEMS.map(({ href, label, badge, section }, i) => {
        const active = isActive(href);
        return (
          <div key={href}>
            {section && (
              <div className="mb-2 mt-6 flex items-center gap-2 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6d5c93]">
                {section}
                <span className="h-px flex-1 bg-[#2a1647]/12" />
              </div>
            )}
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "group relative flex items-baseline gap-3 rounded-2xl border px-3 py-2.5 transition-[padding,background-color,color] duration-300",
                active
                  ? "border-[rgba(139,92,246,0.4)] bg-gradient-to-b from-white/85 to-violet-200/60 text-[#2a1647] shadow-[0_10px_30px_-14px_rgba(124,58,237,0.65),inset_0_1px_0_rgba(255,255,255,0.9)]"
                  : "border-[rgba(139,92,246,0)] text-[#2a1647]/75 hover:bg-white/45 hover:pl-4 hover:text-[#2a1647]",
              )}
            >
              <span className={clsx("font-mono text-[10px] tabular-nums", active ? "text-violet-600" : "text-[#6d5c93]/80")}>
                ({String(i + 1).padStart(3, "0")})
              </span>
              <span className="font-serif text-[19px] leading-none">{label}</span>
              <span className="ml-auto flex items-center gap-2 self-center">
                {badge && queue > 0 && (
                  <span className="rounded-full bg-violet-600 px-2 py-0.5 font-mono text-[10px] font-medium text-white">{queue}</span>
                )}
                {active && <span className="h-1.5 w-1.5 rounded-full bg-violet-600 shadow-[0_0_10px_2px_rgba(124,58,237,0.55)]" />}
              </span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
