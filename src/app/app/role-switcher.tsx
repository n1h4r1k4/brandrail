"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { switchUser } from "./actions";
import { ROLE_LABEL } from "@/lib/workflow";
import { Avatar } from "@/components/ui";
import type { Role } from "@/lib/db/schema";

type Person = { id: string; name: string; title: string; role: Role };

export function RoleSwitcher({ current, people }: { current: string; people: Person[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const me = people.find((p) => p.id === current) ?? people[0];

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch persona"
        className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-left shadow-soft transition hover:border-accent/40"
      >
        <Avatar name={me.name} role={me.role} size={30} />
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold text-ink">{me.name}</span>
          <span className="block text-[11px] text-muted">{ROLE_LABEL[me.role]}</span>
        </span>
        {pending ? <Loader2 size={15} className="animate-spin text-muted" /> : <ChevronDown size={15} className="text-muted" />}
      </button>
      {open && (
        <div role="listbox" className="fade-up absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-lift">
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Act as</div>
          {people.map((p) => (
            <button
              key={p.id}
              role="option"
              aria-selected={p.id === current}
              onClick={() => {
                setOpen(false);
                if (p.id === current) return;
                start(async () => {
                  await switchUser(p.id);
                  router.refresh();
                });
              }}
              className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition", p.id === current ? "bg-accent-soft" : "hover:bg-soft")}
            >
              <Avatar name={p.name} role={p.role} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{p.name}</span>
                <span className="block truncate text-xs text-muted">{ROLE_LABEL[p.role]} · {p.title}</span>
              </span>
              {p.id === current && <Check size={16} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
