"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, StatusTag, Tag, timeAgo } from "@/components/ui";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/workflow";
import type { ContentSource, ContentStatus } from "@/lib/db/schema";

interface Item {
  id: string;
  title: string;
  channel: string;
  source: ContentSource;
  status: ContentStatus;
  currentVersion: number;
  updatedAt: string;
  seeded: boolean;
  open: { blocker: number; major: number; minor: number };
  disputed: number;
}

export function ContentTable({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<ContentStatus | "all">("all");
  const shown = useMemo(() => (filter === "all" ? items : items.filter((i) => i.status === filter)), [items, filter]);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-line p-2">
        {(["all", "draft", "in_review", "changes_requested", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${filter === f ? "bg-accent-soft text-accent" : "text-muted hover:bg-soft"}`}
          >
            {f === "all" ? "All" : STATUS_LABEL[f]} ({f === "all" ? items.length : items.filter((i) => i.status === f).length})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Open issues</th>
              <th className="px-4 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((c) => (
              <tr key={c.id} className="hover:bg-soft/60">
                <td className="px-4 py-2.5">
                  <Link href={`/app/content/${c.id}`} className="font-medium text-ink hover:text-accent">{c.title}</Link>
                  <span className="ml-2 text-xs text-muted">v{c.currentVersion}</span>
                  {c.seeded && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted">seeded</span>}
                </td>
                <td className="px-4 py-2.5 text-muted">{c.channel}</td>
                <td className="px-4 py-2.5"><Tag tone={c.source === "ai" ? "accent" : "grey"}>{SOURCE_LABEL[c.source]}</Tag></td>
                <td className="px-4 py-2.5"><StatusTag status={c.status} /></td>
                <td className="px-4 py-2.5">
                  <span className="flex gap-1">
                    {c.open.blocker > 0 && <Tag tone="blocker">{c.open.blocker} blocker</Tag>}
                    {c.open.major > 0 && <Tag tone="major">{c.open.major} major</Tag>}
                    {c.open.minor > 0 && <Tag tone="minor">{c.open.minor} minor</Tag>}
                    {c.disputed > 0 && <Tag tone="major">{c.disputed} disputed</Tag>}
                    {c.open.blocker + c.open.major + c.open.minor + c.disputed === 0 && <span className="text-xs text-muted">None</span>}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">{timeAgo(c.updatedAt)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">Nothing here yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
