import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Sparkles, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/session";
import { contents } from "@/lib/db/schema";
import { activeProvider, providerLabel } from "@/lib/ai/client";
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
    <div className="flex min-h-screen bg-[#f7f3fe]">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-[#2a1647]/10 bg-[#efe8fc] px-3 py-6 text-[#2a1647] md:flex">
        {/* soft violet glow, like the landing's smoke */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-violet-300/40 blur-3xl" />
          <div className="absolute -right-24 top-1/2 h-56 w-56 rounded-full bg-fuchsia-200/50 blur-3xl" />
        </div>
        <div className="relative flex flex-1 flex-col">
          <Link href="/app" className="px-3 font-serif text-[30px] leading-none tracking-tight">
            brand<span className="text-violet-600">rail</span>
          </Link>
          <p className="mt-2 px-3 font-mono text-[9.5px] uppercase leading-snug tracking-[0.14em] text-[#6d5c93]">Pre-publication brand governance</p>

          <div className="mx-1 mt-6 rounded-2xl border border-[#2a1647]/10 bg-white/55 px-3.5 py-3 shadow-[0_10px_30px_-20px_rgba(42,22,71,0.5)] backdrop-blur">
            <span className="inline-block rounded-full bg-violet-600 px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-white">Workspace</span>
            <div className="mt-2 font-serif text-[22px] leading-tight">Nimbus Pay</div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6d5c93]">Demo sandbox · fictional brand</div>
          </div>

          <Nav queue={queue} />

          <div className="mt-auto space-y-2 px-1 pt-8">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#2a1647]/10 bg-white/55 px-3.5 py-2.5 backdrop-blur">
              <ShieldCheck size={15} className="shrink-0 text-violet-600" />
              <span className="font-mono text-[10px] uppercase tracking-[0.1em]">
                Rulebook <b className="font-semibold text-violet-700">v{s.workspace.activeRulebookVersion}</b> active
              </span>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#2a1647]/10 bg-white/55 px-3.5 py-2.5 backdrop-blur">
              <Sparkles size={15} className={ai === "none" ? "mt-px shrink-0 text-amber-600" : "mt-px shrink-0 text-violet-600"} />
              <span className="font-mono text-[10px] uppercase tracking-[0.1em]">
                AI review{" "}
                {ai === "none" ? <b className="font-semibold text-amber-700">off</b> : <b className="font-semibold text-violet-700">on</b>}
                <span className="mt-1 block normal-case tracking-normal text-[#6d5c93]">{ai === "none" ? "Rule-based checks only" : providerLabel()}</span>
              </span>
            </div>
            <Link href="/" className="block px-2.5 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6d5c93] transition hover:text-violet-700">
              ← Back to the site
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#2a1647]/10 bg-[#f7f3fe]/80 px-4 py-2.5 backdrop-blur-md sm:px-6">
          <Link href="/app" className="font-serif text-[24px] leading-none tracking-tight text-[#2a1647] md:hidden">
            brand<span className="text-violet-600">rail</span>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full border border-[#2a1647]/10 bg-white/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d5c93]">
              Switch persona to see each role&apos;s view →
            </span>
          </div>
          <div className="flex items-center gap-1">
            <SoundToggle />
            <RoleSwitcher current={s.user.id} people={s.people.map((p) => ({ id: p.id, name: p.name, title: p.title, role: p.role }))} />
          </div>
        </header>
        <div className="border-b border-[#2a1647]/10 bg-[#efe8fc] px-3 py-2 md:hidden">
          <Nav queue={queue} horizontal />
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
