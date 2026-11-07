import type { Metadata } from "next";
import { landingProps } from "../landing-props";
import { ScreensView } from "./screens";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Screens · Brandrail", description: "A tour of Brandrail's product screens." };

export default async function Page() {
  return <ScreensView {...await landingProps()} />;
}
