import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { landingProps } from "../../landing-props";
import { SCREENS } from "@/components/landing/content";
import { ScreenDetail } from "./detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = SCREENS.find((x) => x.slug === slug);
  return { title: s ? `${s.name} · Brandrail` : "Brandrail" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = SCREENS.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  return <ScreenDetail index={i} {...await landingProps()} />;
}
