import { Landing } from "./landing";
import { landingProps } from "./landing-props";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const [props, sp] = await Promise.all([landingProps(), searchParams]);
  return <Landing {...props} expired={Boolean(sp.expired)} />;
}
