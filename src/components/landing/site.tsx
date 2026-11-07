"use client";
// Shared pieces of Brandrail's marketing pages, in Brandrail's own look: indigo and teal from
// the logo, sentence-case serif headlines, a floating capsule header, product cards and footer.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowRight, ArrowUpRight, Check, VolumeX } from "lucide-react";
import { useSound } from "@/components/sound";
import { LogoMark } from "@/components/ui";
import { SettingsMenu } from "./bits";
import type { Screen } from "./content";

// ------------------------------------------------------------- type and colour
export const HEAD = "font-serif leading-[1.04] tracking-[-0.012em]";
export const HEAD_SIZE = { fontSize: "clamp(32px, 4vw, 62px)" };
export const SUB_SIZE = { fontSize: "clamp(24px, 2.6vw, 40px)" };

export const DAY = { "--l-bg": "#f5f6fb", "--l-ink": "#121735", "--l-faint": "#c9cde3", "--l-muted": "#5b6386", "--l-line": "rgba(18,23,53,0.13)" };
export const NIGHT = { "--l-bg": "#0b0f2a", "--l-ink": "#eef0ff", "--l-faint": "#343a66", "--l-muted": "#a3a9d6", "--l-line": "rgba(255,255,255,0.12)" };

/** A highlighted word: brand gradient underline. */
export function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block italic">
      {children}
      <span className="absolute inset-x-0 bottom-[0.06em] -z-0 h-[0.09em] rounded-full bg-gradient-to-r from-indigo-400 to-teal-300" />
    </span>
  );
}

/** Small section label: a teal check square and mono text. */
export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em]", className)}>
      <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-teal-400 text-[#0b2a2a]"><Check size={11} strokeWidth={3} /></span>
      {children}
    </span>
  );
}
export function Lede({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("max-w-md text-[15px] leading-relaxed opacity-85", className)}>{children}</p>;
}

const BTN = "inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-[15px] font-medium text-white shadow-[0_12px_30px_-12px_rgba(79,70,229,0.8)] transition hover:bg-indigo-500";
const BTN_GHOST = "inline-flex items-center gap-2 rounded-full border border-current/30 px-5 py-2.5 text-[15px] transition hover:bg-current/10";

export function DemoForm({ children, className, ghost }: { children: React.ReactNode; className?: string; ghost?: boolean }) {
  const { play } = useSound();
  return (
    <form action="/api/demo" method="post" onSubmit={() => play("success")}>
      <button className={className ?? (ghost ? BTN_GHOST : BTN)}>{children}</button>
    </form>
  );
}
export function ButtonLink({ href, children, ghost }: { href: string; children: React.ReactNode; ghost?: boolean }) {
  return <Link href={href} className={ghost ? BTN_GHOST : BTN}>{children}</Link>;
}
export const Go = () => <ArrowRight size={16} strokeWidth={1.8} />;

// ------------------------------------------------------------- header: a floating capsule
function MuteButton() {
  const { enabled, toggle } = useSound();
  return (
    <button type="button" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? "Turn sound off" : "Turn sound on"} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-current/10">
      {enabled ? (
        <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className="eq-bar h-full w-[2px] origin-bottom rounded-full bg-current" style={{ animationDelay: `${i * 140}ms` }} />)}
        </span>
      ) : <VolumeX size={17} strokeWidth={1.6} />}
    </button>
  );
}

export function Header({ hasSession, active }: { hasSession: boolean; active?: "about" | "screens" }) {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const check = () => {
      const y = 40;
      setLight(Array.from(document.querySelectorAll<HTMLElement>("[data-tone='light']")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      }));
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, []);
  const nav = [
    { href: "/about", label: "How it works", key: "about" },
    { href: "/screens", label: "Screens", key: "screens" },
    { href: "/#contact", label: "Contact", key: "contact" },
  ];
  return (
    <header className="fixed inset-x-0 top-3 z-30 px-3 sm:top-4 sm:px-6">
      <div className={clsx(
        "mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border py-1.5 pl-3 pr-1.5 backdrop-blur-xl transition-colors duration-300 sm:pl-4",
        light ? "border-[var(--l-line)] bg-white/80 text-[var(--l-ink)] shadow-[0_8px_30px_-18px_rgba(18,23,53,0.5)]" : "border-white/15 bg-[#0b0f2a]/25 text-white",
      )}>
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="font-serif text-[22px] leading-none tracking-tight">Brandrail</span>
        </Link>
        <nav className="hidden items-center gap-1 text-[14px] lg:flex">
          {nav.map((n) => (
            <Link key={n.key} href={n.href} className={clsx("rounded-full px-4 py-2 transition hover:bg-current/10", active === n.key && "bg-current/10")}>{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <span className="hidden md:block"><SettingsMenu /></span>
          <MuteButton />
          {hasSession ? (
            <Link href="/app" className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Open workspace <Go /></Link>
          ) : (
            <DemoForm className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Try the demo <Go /></DemoForm>
          )}
        </div>
      </div>
    </header>
  );
}

// ------------------------------------------------------------- product shot on an indigo-teal stage
export function ProductShot({ screen, className, tall = true }: { screen: Screen; className?: string; tall?: boolean }) {
  return (
    <div
      className={clsx("group/shot relative overflow-hidden rounded-3xl ring-1 ring-black/5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(18,23,53,0.6)]", tall ? "aspect-[4/5]" : "aspect-[16/11]", className)}
      style={{ background: `linear-gradient(150deg, #1e1b6b 0%, #312e81 45%, ${screen.accent}aa 120%)` }}
    >
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screen.img}
        alt={`${screen.name} screen`}
        className="absolute left-[9%] top-[20%] w-[135%] max-w-none rounded-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] transition duration-700 [transform:perspective(1100px)_rotateY(-14deg)_rotateX(6deg)] group-hover/shot:[transform:perspective(1100px)_rotateY(-8deg)_rotateX(3deg)_translateY(-6px)]"
      />
      <span className="absolute left-4 top-4 inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-teal-400 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#06302c] opacity-0 transition duration-300 group-hover/shot:translate-y-0 group-hover/shot:opacity-100">
        <Check size={11} strokeWidth={3} /> Verified
      </span>
    </div>
  );
}

// ------------------------------------------------------------- footer
export function SiteFooter({ aiNote, next }: { aiNote: string; next: { href: string; label: string } }) {
  const cols: { title: string; items: [string, string, boolean?][] }[] = [
    { title: "Product", items: [["Live demo", "/app"], ["Screens", "/screens"], ["How it works", "/about"]] },
    { title: "Source", items: [["GitHub", "https://github.com/n1h4r1k4/brandrail", true], ["README", "https://github.com/n1h4r1k4/brandrail#readme", true]] },
  ];
  return (
    <footer id="contact" data-tone="light" className="relative bg-[var(--l-bg)] px-5 pb-10 pt-24 text-[var(--l-ink)] sm:px-12">
      <div className="relative overflow-hidden rounded-[32px] bg-[#121735] px-6 py-16 text-white sm:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-teal-400/30 blur-3xl" />
        <div className="relative grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Label>Try it now</Label>
            <h2 className={clsx(HEAD, "mt-5 text-white")} style={HEAD_SIZE}>Run your next post through <Mark>Brandrail</Mark> before anyone else sees it.</h2>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <Lede className="lg:text-right">Paste a caption, an email or a campaign. Get every flag with its source and a fix that keeps your meaning.</Lede>
            <DemoForm className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-medium text-[#121735] transition hover:bg-teal-100">Open the live demo <Go /></DemoForm>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2"><LogoMark size={24} /><span className="font-serif text-xl">Brandrail</span></div>
          <p className="mt-3 max-w-xs text-sm text-[var(--l-muted)]">Pre-publication brand governance. Guardrails, not gatekeepers.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-sm font-semibold">{c.title}</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--l-muted)]">
              {c.items.map(([label, href, ext]) => (
                <li key={label}>
                  <a href={href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined} className="inline-flex items-center gap-1 hover:text-indigo-600">
                    {label} {ext && <ArrowUpRight size={13} />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <div className="text-sm font-semibold">Built for</div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--l-muted)]">Inkloom AI problem statement, We Code Coders hackathon 2026. Solo build by Caffiene Addict.</p>
        </div>
      </div>

      <Link href={next.href} className="group mt-16 flex items-center justify-between gap-6 border-y border-[var(--l-line)] py-8">
        <span className="text-sm text-[var(--l-muted)]">Next</span>
        <span className={clsx(HEAD, "flex items-center gap-4 transition group-hover:text-indigo-600")} style={SUB_SIZE}>
          {next.label}
          <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white transition group-hover:translate-x-1"><ArrowRight size={20} /></span>
        </span>
      </Link>
      <div className="mt-6 flex flex-wrap justify-between gap-3 pr-16 text-xs text-[var(--l-muted)]">
        <span>© 2026 Brandrail. Demo data is fictional.</span>
        <span>{aiNote}</span>
      </div>
    </footer>
  );
}

// ------------------------------------------------------------- number that counts up when it scrolls into view
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const m = value.match(/^(\D*)(\d+)(.*)$/);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!m) return;
    const target = Number(m[2]);
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1200);
        setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [m?.[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className={className}>{m ? `${m[1]}${n}${m[3]}` : value}</span>;
}

