"use client";
// The "How it works" page's world (original, built in code with three.js): an evidence map.
// A glowing core sits among rings of Brandrail rule cards; citation lines with travelling
// pulses link the core to the cards it relies on. The camera moves through it as you scroll.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Quality } from "./world";

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const RULES = ["TON-03", "TRM-01", "LEG-01", "CLM-04", "ACC-01", "ACC-03", "F-041", "VIS-02", "TON-01", "CLM-02", "F-021", "LEG-04"];

function cardTexture(code: string, kind: number) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 164;
  const g = c.getContext("2d")!;
  g.fillStyle = "#eef0ff";
  g.beginPath();
  g.roundRect(2, 2, 252, 160, 16);
  g.fill();
  g.fillStyle = kind === 0 ? "#4f46e5" : kind === 1 ? "#0d9488" : "#334155";
  g.beginPath();
  g.roundRect(2, 2, 252, 38, [16, 16, 0, 0]);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "bold 20px monospace";
  g.fillText(code, 16, 28);
  g.fillStyle = kind === 1 ? "#5eead4" : "#c7d2fe";
  g.beginPath();
  g.arc(232, 21, 7, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i === 1 ? "#a5b4fc" : "#cbd0e8";
    g.beginPath();
    g.roundRect(16, 58 + i * 24, i === 3 ? 120 : 210, 10, 5);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(220,255,250,1)");
  grd.addColorStop(0.3, "rgba(94,234,212,0.45)");
  grd.addColorStop(1, "rgba(94,234,212,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const KEYS = [
  { cam: [0, 3, 22], look: [0, 0.5, 0] },
  { cam: [9, 1.5, 9], look: [0, 0.8, 0] },
  { cam: [-6, 4.5, 6], look: [2, 0, -2] },
  { cam: [-16, 2.5, -7], look: [2, 0.5, 0] },
  { cam: [2, 9, -12], look: [0, 0, 0] },
];

export function EvidenceScene({ quality, containerId }: { quality: Quality; containerId: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const hi = quality === "high";
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: hi, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 1.5 : 1));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#070b22");
    scene.fog = new THREE.FogExp2("#0a1030", 0.032);
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
    const trash: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (trash.push(x), x);

    // ---- the core: a wire icosahedron around a glowing heart
    const core = new THREE.Group();
    scene.add(core);
    const wire = new THREE.LineSegments(keep(new THREE.EdgesGeometry(keep(new THREE.IcosahedronGeometry(1.5, 1)))), keep(new THREE.LineBasicMaterial({ color: "#5eead4", transparent: true, opacity: 0.8 })));
    core.add(wire);
    const inner = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(0.7, 2)), keep(new THREE.MeshBasicMaterial({ color: "#99f6e4" })));
    core.add(inner);
    const glowTex = keep(glowTexture());
    const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    glow.scale.set(7, 7, 1);
    core.add(glow);

    // ---- floor grid
    const grid = new THREE.GridHelper(80, 60, "#1d2560", "#141a48");
    grid.position.y = -3.2;
    keep(grid.geometry);
    keep(grid.material as THREE.Material);
    scene.add(grid);

    // ---- rings of rule cards
    const textures = RULES.map((r, i) => keep(cardTexture(r, i % 3)));
    const cardGeo = keep(new THREE.PlaneGeometry(1.6, 1.02));
    const rr = rand(31);
    const rings = [{ r: 4.6, n: 10, y: 0.6, speed: 0.06 }, { r: 7.4, n: 16, y: -0.4, speed: -0.035 }, { r: 10.5, n: 22, y: 1.4, speed: 0.022 }];
    const cards: { m: THREE.Mesh; ring: number; a: number; y: number; bob: number }[] = [];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < (hi ? ring.n : Math.ceil(ring.n * 0.6)); i++) {
        const mat = keep(new THREE.MeshBasicMaterial({ map: textures[Math.floor(rr() * textures.length)], side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
        const m = new THREE.Mesh(cardGeo, mat);
        scene.add(m);
        cards.push({ m, ring: ri, a: (i / ring.n) * Math.PI * 2 + rr() * 0.2, y: ring.y + (rr() - 0.5) * 2.4, bob: rr() * 6 });
      }
    });

    // ---- citation links from the core to some cards, with pulses running along them
    const linked = cards.filter((_, i) => i % 3 === 0);
    const linkPos = new Float32Array(linked.length * 6);
    const linkGeo = keep(new THREE.BufferGeometry());
    linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
    const links = new THREE.LineSegments(linkGeo, keep(new THREE.LineBasicMaterial({ color: "#818cf8", transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })));
    scene.add(links);
    const pulsePos = new Float32Array(linked.length * 3);
    const pulseGeo = keep(new THREE.BufferGeometry());
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
    const pulses = new THREE.Points(pulseGeo, keep(new THREE.PointsMaterial({ color: "#5eead4", size: 0.28, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    scene.add(pulses);
    const phase = linked.map(() => rr());

    // ---- dust
    const dustN = hi ? 900 : 400, dp = new Float32Array(dustN * 3), rd = rand(7);
    for (let i = 0; i < dustN; i++) dp.set([(rd() - 0.5) * 50, (rd() - 0.3) * 18, (rd() - 0.5) * 50], i * 3);
    const dustGeo = keep(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dustGeo, keep(new THREE.PointsMaterial({ color: "#c7d2fe", size: 0.08, map: glowTex, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })));
    scene.add(dust);

    // ---- scroll, mouse, resize, visibility
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove);
    const progress = () => {
      const c = document.getElementById(containerId);
      if (!c) return 0;
      const r = c.getBoundingClientRect();
      return Math.min(KEYS.length - 1, Math.max(0, (-r.top / Math.max(1, r.height - window.innerHeight)) * (KEYS.length - 1)));
    };
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    const container = document.getElementById(containerId);
    if (container) io.observe(container);

    const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
    const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
    const clock = new THREE.Clock();
    let p = progress(), last = 0, raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const now = clock.getElapsedTime(), dt = Math.min(0.5, now - last);
      last = now;
      const ease = (k: number) => 1 - Math.exp(-dt * k);
      mouse.x += (mouse.tx - mouse.x) * ease(3);
      mouse.y += (mouse.ty - mouse.y) * ease(3);
      p += (progress() - p) * ease(4.5);
      const i0 = Math.floor(p), i1 = Math.min(KEYS.length - 1, i0 + 1), f = p - i0, s = f * f * (3 - 2 * f);
      camPos.copy(v3(KEYS[i0].cam)).lerp(v3(KEYS[i1].cam), s).add(tmp.set(mouse.x * 1.2, -mouse.y * 0.6, 0));
      look.copy(v3(KEYS[i0].look)).lerp(v3(KEYS[i1].look), s);
      camera.position.copy(camPos);
      camera.lookAt(look);

      core.rotation.y = now * 0.25;
      wire.rotation.x = now * 0.15;
      inner.scale.setScalar(1 + Math.sin(now * 2) * 0.05);
      for (const c of cards) {
        const ring = rings[c.ring];
        const a = c.a + now * ring.speed;
        c.m.position.set(Math.cos(a) * ring.r, c.y + Math.sin(now * 0.6 + c.bob) * 0.15, Math.sin(a) * ring.r);
        c.m.lookAt(camera.position.x, c.m.position.y, camera.position.z); // always readable from the camera
      }
      linked.forEach((c, i) => {
        const q = c.m.position;
        linkPos.set([0, 0, 0, q.x, q.y, q.z], i * 6);
        const t = (now * 0.35 + phase[i]) % 1;
        pulsePos.set([q.x * t, q.y * t, q.z * t], i * 3);
      });
      linkGeo.attributes.position.needsUpdate = true;
      pulseGeo.attributes.position.needsUpdate = true;
      dust.rotation.y = now * 0.008;
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      trash.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [quality, containerId]);

  return <div ref={host} className="fixed inset-0 z-0" style={{ background: "radial-gradient(80% 60% at 50% 45%, #18205a 0%, #070b22 65%, #04061a 100%)" }} aria-hidden="true" />;
}
