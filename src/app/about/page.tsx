import type { Metadata } from "next";
import { landingProps } from "../landing-props";
import { About } from "./about";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "About Brandrail", description: "Why Brandrail checks every word, image and claim before it goes live, and who built it." };

export default async function Page() {
  return <About {...await landingProps()} />;
}
