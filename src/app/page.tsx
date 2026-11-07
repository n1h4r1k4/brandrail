import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { activeProvider, providerLabel, providerName } from "@/lib/ai/client";
import { Landing } from "./landing";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const [session, sp, jar] = await Promise.all([getSession().catch(() => null), searchParams, cookies()]);
  const ai = activeProvider();
  return (
    <Landing
      hasSession={Boolean(session)}
      showGate={!jar.get("br_gate")}
      expired={Boolean(sp.expired)}
      aiNote={ai === "none" ? "AI review off on this deployment" : `AI: ${providerName()} (${providerLabel().split(" · ")[1]}), masked before sending`}
    />
  );
}
