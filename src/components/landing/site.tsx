"use client";
// Shared pieces of Brandrail's marketing pages: header, pills, captions, glass buttons,
// product-shot cards with a glitch hover, and the footer that reveals the next page.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CornerDownRight, CornerRightDown, MoveUpRight, Sparkles, VolumeX } from "lucide-react";
import { useSound } from "@/components/sound";
import { SettingsMenu } from "./bits";
import type { Screen } from "./content";

// ------------------------------------------------------------- type scale (medium, not huge)
export const BIG = "font-serif uppercase leading-[0.95] tracking-[-0.015em]";
export const BIG_SIZE = { fontSize: "clamp(32px, 4.3vw, 68px)" };
export const MID_SIZE = { fontSize: "clamp(26px, 3vw, 48px)" };

export const DAY = { "--l-bg": "#f4effd", "--l-ink": "#2a1647", "--l-faint": "#cbbfe6", "--l-muted": "#6d5c93", "--l-line": "rgba(42,22,71,0.16)" };
export const NIGHT = { "--l-bg": "#0c0920", "--l-ink": "#f1edff", "--l-faint": "#3e3466", "--l-muted": "#a79ed0", "--l-line": "rgba(255,255,255,0.12)" };

export function Pill({ children, icon }: { children: React.ReactNode; icon?: boolean }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-violet-600 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white">
      {icon && <Sparkles size={11} />}{children}
    </span>
  );
}
export function Caption({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("max-w-sm font-mono text-[11px] font-medium uppercase leading-[1.4] tracking-[0.12em]", className)}>{children}</p>;
}
export const Arrow = ({ className }: { className?: string }) => <CornerDownRight className={clsx("inline-block h-[0.42em] w-[0.42em]", className)} strokeWidth={1.25} />;
export const DownArrow = ({ className }: { className?: string }) => <CornerRightDown className={clsx("inline-block", className)} size={16} strokeWidth={1.5} />;

const GLASS =
  "inline-flex items-center gap-2.5 rounded-full border border-violet-500/60 bg-gradient-to-r from-violet-200/70 via-white/60 to-violet-200/70 px-6 py-3 text-[15px] text-[#3b1a74] shadow-[0_10px_40px_-14px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur transition hover:shadow-[0_10px_46px_-8px_rgba(124,58,237,0.75)]";
const GLASS_DARK =
  "inline-flex items-center gap-2.5 rounded-full border border-violet-400/70 bg-gradient-to-r from-violet-500/25 via-white/10 to-violet-500/25 px-5 py-2.5 text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur transition hover:from-violet-500/45 hover:to-violet-500/45";

export function DemoForm({ children, className, dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  const { play } = useSound();
  return (
    <form action="/api/demo" method="post" onSubmit={() => play("success")}>
      <button className={className ?? (dark ? GLASS_DARK : GLASS)}>{children}</button>
    </form>
  );
}
export function GlassLink({ href, children, dark }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return <Link href={href} className={dark ? GLASS_DARK : GLASS}>{children}</Link>;
}
export const Hook = () => <CornerDownRight size={16} strokeWidth={1.6} />;

// ------------------------------------------------------------- sound button (icon only)
function MuteButton() {
  const { enabled, toggle } = useSound();
  return (
    <button type="button" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? "Turn sound off" : "Turn sound on"} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/10">
      {enabled ? (
        <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className="eq-bar h-full w-[2px] origin-bottom rounded-full bg-current" style={{ animationDelay: `${i * 140}ms` }} />)}
        </span>
      ) : <VolumeX size={17} strokeWidth={1.6} />}
    </button>
  );
}

// ------------------------------------------------------------- header
export function Header({ hasSession, active }: { hasSession: boolean; active?: "about" | "screens" }) {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const check = () => {
      const y = 36;
      const hit = Array.from(document.querySelectorAll<HTMLElement>("[data-tone='light']")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      });
      setLight(hit);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, []);
  const nav = [
    { href: "/about", label: "About", key: "about" },
    { href: "/screens", label: "Screens", key: "screens" },
    { href: "/#contact", label: "Contact", key: "contact" },
  ];
  return (
    <header className={clsx("fixed inset-x-0 top-0 z-30 transition-colors duration-300", light ? "bg-[var(--l-bg)] text-[var(--l-ink)]" : "text-white")}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4 sm:px-12 lg:grid-cols-[1fr_1.4fr_auto_1fr_auto]">
        <Link href="/" className="font-serif text-[28px] leading-none tracking-tight">
          brand<span style={{ color: "var(--accent, #8b5cf6)" }} className="transition-colors duration-700">rail</span>
        </Link>
        <nav className="hidden items-center gap-12 font-mono text-[11px] font-medium uppercase tracking-[0.14em] lg:flex">
          {nav.map((n) => (
            <Link key={n.key} href={n.href} className={clsx("underline-offset-[6px] hover:underline", active === n.key && "underline")}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden justify-self-center md:block"><SettingsMenu /></div>
        <div className="hidden justify-self-center lg:block"><MuteButton /></div>
        <div className="flex items-center justify-end gap-2">
          <span className="lg:hidden"><MuteButton /></span>
          {hasSession ? (
            <GlassLink href="/app" dark={!light}>Open workspace <Hook /></GlassLink>
          ) : (
            <DemoForm dark={!light}>Try the demo <Hook /></DemoForm>
          )}
        </div>
      </div>
    </header>
  );
}

// ------------------------------------------------------------- product shot: a screenshot floating on a coloured stage
export function ProductShot({ screen, className, tall = true, info = true }: { screen: Screen; className?: string; tall?: boolean; info?: boolean }) {
  const idx = 1 + ["review", "verified", "insights", "rulebook", "dashboard", "facts", "new", "audit"].indexOf(screen.slug);
  return (
    <div
      className={clsx("shot group/shot relative overflow-hidden rounded-[28px]", tall ? "aspect-[4/5]" : "aspect-[16/11]", className)}
      style={{ background: `radial-gradient(120% 90% at 70% 20%, ${screen.accent}55 0%, #1a0f3a 55%, #0b0716 100%)` }}
    >
      <div className="absolute inset-0 [perspective:1100px]">
        {[0, 1, 2].map((layer) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={layer}
            src={screen.img}
            alt={layer === 0 ? `${screen.name} screen` : ""}
            aria-hidden={layer > 0}
            className={clsx(
              "absolute left-[10%] top-[24%] w-[140%] max-w-none rounded-xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] transition duration-700 [transform:rotateY(-16deg)_rotateX(7deg)] group-hover/shot:[transform:rotateY(-10deg)_rotateX(4deg)_scale(1.03)]",
              layer === 1 && "glitch-r opacity-0 mix-blend-screen group-hover/shot:opacity-70",
              layer === 2 && "glitch-c opacity-0 mix-blend-screen group-hover/shot:opacity-70",
            )}
            style={layer === 1 ? { filter: "url(#br-red)" } : layer === 2 ? { filter: "url(#br-cyan)" } : undefined}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      {info && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-[3px] bg-black/35 px-4 font-mono text-[10px] uppercase leading-tight tracking-[0.06em] text-white opacity-0 transition duration-300 group-hover/shot:opacity-100 sm:text-[11px]">
          <div className="flex justify-between"><span>Scrn</span><span>/{String(idx).padStart(2, "0")}</span></div>
          <div className="flex justify-between pl-[8%]"><span>Updated:</span><span>{screen.date}</span></div>
          <div className="flex justify-between pl-[16%]"><span>Name:</span><span>{screen.name}</span></div>
          <div className="flex justify-between pl-[24%]"><span>Type:</span><span>{screen.type}</span></div>
          <div className="flex justify-between pl-[18%]"><span>Scope:</span><span className="text-right">{screen.scope.map((s) => <span key={s} className="block">{s}</span>)}</span></div>
          <div className="mt-1 flex justify-between"><span>Stack:</span><span className="text-right">{screen.stack.map((s) => <span key={s} className="block">{s}</span>)}</span></div>
        </div>
      )}
    </div>
  );
}

// colour filters used by the glitch layers
export function GlitchDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id="br-red"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" /></filter>
      <filter id="br-cyan"><feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" /></filter>
    </svg>
  );
}

// ------------------------------------------------------------- footer + "keep scrolling" reveal of the next page
export function SiteFooter({ aiNote, next, revealBg }: { aiNote: string; next: { href: string; label: string }; revealBg?: string }) {
  const cols: { title: string; items: [string, string, boolean?][] }[] = [
    { title: "Links", items: [["Live demo", "/app"], ["GitHub", "https://github.com/n1h4r1k4/brandrail", true], ["README", "https://github.com/n1h4r1k4/brandrail#readme", true]] },
    { title: "Pages", items: [["Home", "/"], ["About", "/about"], ["Screens", "/screens"], ["Contact", "/#contact"]] },
  ];
  return (
    <>
      <footer id="contact" data-tone="light" className="relative bg-[var(--l-bg)] px-5 pt-32 text-[var(--l-ink)] sm:px-12">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <Pill icon>Try it now</Pill>
            <div className="mt-8" style={BIG_SIZE}>
              <div className={BIG}><span className="normal-case italic">Let&apos;s</span> check</div>
              <div className={BIG}><Arrow className="mr-[1.4em]" /> something</div>
              <div className={BIG}>real</div>
            </div>
            <div className="mt-12"><DemoForm>Open the live demo <Hook /></DemoForm></div>
          </div>
          <div>
            <Caption>Have a post, an email or a campaign? Run it through the rails before it goes live</Caption>
            <div className="mt-14 grid gap-12 sm:grid-cols-2">
              {cols.map((c) => (
                <div key={c.title}>
                  <div className="flex items-center gap-1 text-xl uppercase text-[var(--l-muted)]/70">{c.title} <DownArrow /></div>
                  <ul className="mt-5 space-y-3 font-mono text-[12px] font-medium uppercase tracking-[0.08em]">
                    {c.items.map(([label, href, ext], i) => (
                      <li key={label}>
                        <a href={href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined} className="group inline-flex items-center gap-2 hover:text-violet-600">
                          <span className="text-[var(--l-muted)]">[{String(i + 1).padStart(2, "0")}]</span> {label} {ext && <MoveUpRight size={13} />}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div>
                <div className="flex items-center gap-1 text-xl uppercase text-[var(--l-muted)]/70">Built for <DownArrow /></div>
                <p className="mt-5 font-mono text-[12px] font-medium uppercase leading-relaxed tracking-[0.08em]">Inkloom AI problem statement<br />We Code Coders hackathon, 2026</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xl uppercase text-[var(--l-muted)]/70">Team <DownArrow /></div>
                <p className="mt-5 font-mono text-[12px] font-medium uppercase leading-relaxed tracking-[0.08em]">Caffiene Addict<br />Solo build</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-40 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--l-ink)]/80 py-6 pr-16 text-[15px]">
          <span>© 2026 Brandrail. Demo data is fictional</span>
          <span className="inline-flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.12em]">Keep scrolling <DownArrow /></span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--l-muted)]">{aiNote}</span>
        </div>
      </footer>
      <NextReveal next={next} bg={revealBg} />
    </>
  );
}

function NextReveal({ next, bg }: { next: { href: string; label: string }; bg?: string }) {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  const [p, setP] = useState(0);
  const gone = useRef(false);
  useEffect(() => {
    router.prefetch(next.href);
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const v = Math.min(1, Math.max(0, (window.innerHeight - r.top) / r.height));
      setP(v);
      if (v > 0.985 && !gone.current) {
        gone.current = true;
        setTimeout(() => router.push(next.href), 250);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [next.href, router]);
  const R = 46, C = 2 * Math.PI * R;
  return (
    <section ref={ref} data-world="show" className="relative h-[170vh]" style={{ background: bg }}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-end overflow-hidden pb-14 text-white">
        <div className="absolute inset-x-5 top-10 flex justify-between font-mono text-[12px] font-medium uppercase tracking-[0.12em] sm:inset-x-12">
          <span>(Just</span><span>continue</span><span>to</span><span>reveal)</span>
        </div>
        <svg width="120" height="120" viewBox="0 0 120 120" className="mb-6">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <circle cx="60" cy="60" r={R} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 60 60)" />
          <path d="M54 52 h8 v14 m-5 -4 l5 5 l5 -5" fill="none" stroke="#fff" strokeWidth="1.6" />
        </svg>
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.14em]">[ Next page ]</span>
        <Link href={next.href} className="mt-3 font-serif leading-none" style={{ fontSize: "clamp(40px, 5.5vw, 84px)" }}>{next.label}</Link>
      </div>
    </section>
  );
}
