"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, BookMarked, ClipboardCheck, Database, LayoutDashboard, PlusCircle, ScrollText } from "lucide-react";

const ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/new", label: "New content", icon: PlusCircle },
  { href: "/app/review", label: "Review queue", icon: ClipboardCheck, badge: true },
  { href: "/app/rulebook", label: "Rulebook", icon: BookMarked, section: "Brand kit" },
  { href: "/app/facts", label: "Facts Ledger", icon: Database },
  { href: "/app/insights", label: "Insights", icon: BarChart3, section: "Governance" },
  { href: "/app/audit", label: "Audit log", icon: ScrollText },
];

export function Nav({ queue, horizontal }: { queue: number; horizontal?: boolean }) {
  const path = usePathname();
  return (
    <nav className={clsx(horizontal ? "flex gap-1 overflow-x-auto" : "mt-5 flex flex-col gap-0.5")}>
      {ITEMS.map(({ href, label, icon: Icon, badge, section }) => {
        const active = href === "/app" ? path === "/app" : path.startsWith(href) || (href === "/app/new" && path.startsWith("/app/content"));
        return (
          <div key={href}>
            {section && !horizontal && <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{section}</div>}
            <Link
              href={href}
              className={clsx(
                "group flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                horizontal
                  ? active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-soft"
                  : active ? "bg-indigo-500/20 text-white shadow-[inset_2px_0_0_#818cf8]" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon size={16} className={clsx(!horizontal && (active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"))} />
              {label}
              {badge && queue > 0 && <span className="ml-auto rounded-full bg-indigo-500 px-1.5 text-[11px] font-semibold text-white">{queue}</span>}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
