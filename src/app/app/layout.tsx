import { and, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { contents } from "@/lib/db/schema";
import { aiEnabled, REVIEW_MODEL } from "@/lib/ai/client";
import { ROLE_LABEL } from "@/lib/workflow";
import { Nav } from "./nav";
import { RoleSwitcher } from "./role-switcher";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const inReview = await s.db
    .select({ id: contents.id, required: contents.requiredRoles })
    .from(contents)
    .where(and(eq(contents.workspaceId, s.workspace.id), inArray(contents.status, ["in_review"])));
  const role = s.user.role === "admin" ? "reviewer" : s.user.role;
  const queue = inReview.filter((c) => c.required.includes(role)).length;
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white px-3 py-5 md:flex">
        <a href="/app" className="px-3 font-display text-lg font-bold text-ink">
          Brand<span className="text-accent">rail</span>
        </a>
        <div className="mt-1 px-3 text-xs text-muted">{s.workspace.name}</div>
        <Nav queue={queue} />
        <div className="mt-auto rounded-lg bg-soft p-3 text-[11px] leading-relaxed text-muted">
          Rulebook <b className="text-ink">v{s.workspace.activeRulebookVersion}</b> active
          <br />
          {aiEnabled() ? <>AI review: <b className="text-ink">{REVIEW_MODEL}</b></> : <>AI review: <b className="text-major">off</b> (no API key)</>}
          <br />
          Demo data is fictional.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6">
          <div className="md:hidden">
            <a href="/app" className="font-display font-bold text-ink">Brand<span className="text-accent">rail</span></a>
          </div>
          <div className="hidden text-xs text-muted md:block">
            Acting as <b className="text-ink">{s.user.name}</b> · {s.user.title} · <span className="text-accent">{ROLE_LABEL[s.user.role]}</span>
          </div>
          <RoleSwitcher current={s.user.id} people={s.people.map((p) => ({ id: p.id, name: p.name, title: p.title, role: p.role }))} />
        </header>
        <div className="border-b border-line bg-white px-3 py-2 md:hidden">
          <Nav queue={queue} horizontal />
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
