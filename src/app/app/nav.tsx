"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, BookMarked, ClipboardCheck, Database, LayoutDashboard, PlusCircle, ScrollText } from "lucide-react";

const ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/new", label: "New content", icon: PlusCircle },
  { href: "/app/review", label: "Review queue", icon: ClipboardCheck, badge: true },
  { href: "/app/rulebook", label: "Rulebook", icon: BookMarked },
  { href: "/app/facts", label: "Facts Ledger", icon: Database },
  { href: "/app/insights", label: "Insights", icon: BarChart3 },
  { href: "/app/audit", label: "Audit log", icon: ScrollText },
];

export function Nav({ queue, horizontal }: { queue: number; horizontal?: boolean }) {
  const path = usePathname();
  return (
    <nav className={clsx(horizontal ? "flex gap-1 overflow-x-auto" : "mt-6 flex flex-col gap-0.5")}>
      {ITEMS.map(({ href, label, icon: Icon, badge }) => {
        const active = href === "/app" ? path === "/app" : path.startsWith(href) || (href === "/app/new" && path.startsWith("/app/content"));
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition",
              active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-soft",
            )}
          >
            <Icon size={16} />
            {label}
            {badge && queue > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{queue}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
