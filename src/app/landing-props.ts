import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { activeProvider, providerLabel, providerName } from "@/lib/ai/client";

/** What every marketing page needs from the server: session, gate cookie and the AI note. */
export async function landingProps() {
  const [session, jar] = await Promise.all([getSession().catch(() => null), cookies()]);
  const ai = activeProvider();
  return {
    hasSession: Boolean(session),
    showGate: !jar.get("br_gate"),
    aiNote: ai === "none" ? "AI review off on this deployment" : `AI: ${providerName()} (${providerLabel().split(" · ")[1]}), masked before sending`,
  };
}
