"use client";
// Smoke trail that follows the cursor: soft puffs are emitted along the pointer path, carried by
// the pointer's momentum and a swirling noise field, then grow and fade. Drawn on a fixed canvas
// above the light sections' background and below their text.
import { useEffect, useRef } from "react";

interface Puff { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

export function SmokeCursor({ activeId, dark = false }: { activeId: string; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // touch devices: no cursor effect
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const puffs: Puff[] = [];
    let last: { x: number; y: number } | null = null;
    let active = false;
    const zone = document.getElementById(activeId);
    const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; }, { threshold: 0 });
    if (zone) io.observe(zone);

    const onMove = (e: PointerEvent) => {
      if (!active) { last = null; return; }
      const p = { x: e.clientX, y: e.clientY };
      if (last) {
        const dx = p.x - last.x, dy = p.y - last.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.min(8, Math.ceil(dist / 14));
        for (let s = 0; s < steps; s++) {
          const k = s / steps;
          if (puffs.length > 420) puffs.shift();
          puffs.push({
            x: last.x + dx * k, y: last.y + dy * k,
            vx: dx * 0.06 + (Math.random() - 0.5) * 0.6, vy: dy * 0.06 + (Math.random() - 0.5) * 0.6,
            r: 18 + Math.random() * 18, life: 0, max: 110 + Math.random() * 90, hue: Math.random(),
          });
        }
      }
      last = p;
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, w, h);
      if (!puffs.length) return;
      // keep the smoke inside the light sections
      const top = Math.max(0, zone ? zone.getBoundingClientRect().top : 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, w, h - top);
      ctx.clip();
      const t = time * 0.0004;
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life++;
        if (p.life > p.max) { puffs.splice(i, 1); continue; }
        // swirl: a cheap curl-like field from rotating sines
        const sx = Math.sin(p.y * 0.008 + t * 3) + Math.sin(p.y * 0.017 - t * 2);
        const sy = Math.cos(p.x * 0.009 - t * 2.5) + Math.cos(p.x * 0.015 + t * 1.7);
        p.vx = p.vx * 0.965 + sx * 0.06;
        p.vy = p.vy * 0.965 + sy * 0.06 - 0.02;
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.55;
        const k = p.life / p.max;
        const alpha = (dark ? 0.08 : 0.16) * Math.sin(Math.PI * Math.min(1, k * 1.2));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const col = dark
          ? (p.hue < 0.5 ? "129,140,248" : "45,212,191")
          : (p.hue < 0.45 ? "255,255,255" : p.hue < 0.8 ? "199,210,254" : "153,246,228");
        g.addColorStop(0, `rgba(${col},${alpha})`);
        g.addColorStop(0.55, `rgba(${col},${alpha * 0.55})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [activeId, dark]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[15]" aria-hidden="true" />;
}
