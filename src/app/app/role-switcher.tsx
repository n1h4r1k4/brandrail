"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { switchUser } from "./actions";
import { ROLE_LABEL } from "@/lib/workflow";
import type { Role } from "@/lib/db/schema";

export function RoleSwitcher({ current, people }: { current: string; people: { id: string; name: string; title: string; role: Role }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <UserRound size={16} className="text-muted" />
      <span className="sr-only">Switch persona</span>
      <select
        className="rounded-lg border border-line bg-white py-1.5 pl-2 pr-7 text-sm font-medium text-ink disabled:opacity-60"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            await switchUser(id);
            router.refresh();
          });
        }}
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {ROLE_LABEL[p.role]}
          </option>
        ))}
      </select>
    </label>
  );
}
