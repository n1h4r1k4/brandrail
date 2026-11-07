import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Sparkles, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/session";
import { contents } from "@/lib/db/schema";
import { activeProvider, providerLabel } from "@/lib/ai/client";
import { Logo } from "@/components/ui";
import { Nav } from "./nav";
import { RoleSwitcher } from "./role-switcher";
import { SoundToggle } from "@/components/sound";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const inReview = await s.db
    .select({ id: contents.id, required: contents.requiredRoles })
    .from(contents)
    .where(and(eq(contents.workspaceId, s.workspace.id), eq(contents.status, "in_review")));
  const role = s.user.role === "admin" ? "reviewer" : s.user.role;
  const queue = inReview.filter((c) => c.required.includes(role)).length;
  const ai = activeProvider();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#0b1224] px-3 py-5 text-slate-300 md:flex">
        <Link href="/app" className="px-3"><Logo dark /></Link>
        <div className="mx-3 mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Workspace</div>
          <div className="mt-0.5 text-sm font-medium text-white">Nimbus Pay</div>
          <div className="text-[11px] text-slate-400">Demo sandbox · fictional brand</div>
        </div>
        <Nav queue={queue} />
        <div className="mt-auto space-y-2 px-1">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs">
            <ShieldCheck size={15} className="text-teal-300" />
            <span>Rulebook <b className="text-white">v{s.workspace.activeRulebookVersion}</b> active</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs">
            <Sparkles size={15} className={ai === "none" ? "mt-0.5 text-amber-300" : "mt-0.5 text-indigo-300"} />
            <span>
              AI review{" "}
              {ai === "none" ? <b className="text-amber-300">off</b> : <b className="text-white">on</b>}
              <span className="block text-[11px] text-slate-400">{ai === "none" ? "Rule-based checks only" : providerLabel()}</span>
            </span>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-2.5 backdrop-blur-md sm:px-6">
          <Link href="/app" className="md:hidden"><Logo /></Link>
          <div className="hidden items-center gap-2 text-xs text-muted md:flex">
            <span className="rounded-full bg-soft px-2.5 py-1">Switch persona to see each role&apos;s view →</span>
          </div>
          <div className="flex items-center gap-1">
            <SoundToggle />
            <RoleSwitcher current={s.user.id} people={s.people.map((p) => ({ id: p.id, name: p.name, title: p.title, role: p.role }))} />
          </div>
        </header>
        <div className="border-b border-line bg-white px-3 py-2 md:hidden">
          <Nav queue={queue} horizontal />
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
