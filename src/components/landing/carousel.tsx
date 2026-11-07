"use client";
// The Screens page's world (original, built in code with three.js): a dark hall with a ceiling
// grid and a curved wall of glowing cards, one per product screen, reflected in the floor.
// Scroll, drag or use the arrow keys to turn it; the front card's colour lights the room.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Quality } from "./world";

export interface CarouselItem { img: string; accent: string }
export interface CarouselApi { goTo: (i: number) => void; step: (d: number) => void }

const W = 2.5, H = 3.3, R = 10.5, STEP = 0.27, SLOTS = 8; // slots on each side of the centre

const cardFrag = `
  uniform sampler2D map; uniform float focus; uniform vec3 accent; uniform float reflection; uniform float time;
  varying vec2 vUv;
  float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main(){
    vec2 p = (vUv - 0.5) * vec2(${W.toFixed(2)}, ${H.toFixed(2)});
    float d = box(p, vec2(${(W / 2).toFixed(3)}, ${(H / 2).toFixed(3)}), 0.16);
    if (d > 0.0) discard;
    vec2 uv = vec2(0.17 + vUv.x * 0.48, vUv.y);
    vec3 c = texture2D(map, uv).rgb;
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    // cards away from the front are dimmed, tinted and striped
    vec3 dim = mix(vec3(lum), accent, 0.35) * 0.3;
    float stripes = 0.75 + 0.25 * step(0.5, fract(vUv.x * 90.0));
    c = mix(dim * stripes, c * 0.8, focus);
    float edge = smoothstep(-0.07, 0.0, d);
    c = mix(c, accent * 1.6, edge * (0.55 + 0.45 * focus));
    float a = 1.0;
    if (reflection > 0.5) { a = 0.3 * (1.0 - smoothstep(0.0, 0.7, vUv.y)); c *= 0.7; }
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }`;

const glowFrag = `
  uniform vec3 accent; uniform float focus; varying vec2 vUv;
  float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main(){
    vec2 p = (vUv - 0.5) * vec2(${(W + 1.2).toFixed(2)}, ${(H + 1.2).toFixed(2)});
    float d = box(p, vec2(${(W / 2).toFixed(3)}, ${(H / 2).toFixed(3)}), 0.16);
    float g = exp(-max(d, 0.0) * 7.0) * step(0.0, d);
    gl_FragColor = vec4(accent * g * (0.35 + 0.9 * focus), g * (0.25 + 0.75 * focus));
  }`;

const vert = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

export function Carousel({ items, quality, onActive, onOpen, apiRef }: {
  items: CarouselItem[]; quality: Quality; onActive: (i: number) => void; onOpen: (i: number) => void; apiRef: React.RefObject<CarouselApi | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onActive, onOpen });
  cb.current = { onActive, onOpen };

  useEffect(() => {
    const el = host.current;
    if (!el || !items.length) return;
    const hi = quality === "high";
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 1.5 : 1));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#040308");
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.set(0, 0.35, 7.2);
    camera.lookAt(0, 0.05, -4);
    const trash: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (trash.push(x), x);
    const accent = new THREE.Color(items[0].accent), target = new THREE.Color(items[0].accent);

    // ---- ceiling grid and light beams
    const grid = new THREE.GridHelper(80, 48, "#1c1a26", "#15131d");
    grid.position.y = 5.2;
    scene.add(grid);
    keep(grid.geometry);
    keep(grid.material as THREE.Material);
    const beamPts: number[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 2.6;
      beamPts.push(0, 5.15, -6, Math.sin(a) * 40, 5.15, -6 + Math.cos(a) * 40);
    }
    const beamGeo = keep(new THREE.BufferGeometry());
    beamGeo.setAttribute("position", new THREE.Float32BufferAttribute(beamPts, 3));
    const beamMat = keep(new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }));
    scene.add(new THREE.LineSegments(beamGeo, beamMat));

    // ---- floor and the glowing rail under the cards
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(120, 120)), keep(new THREE.MeshBasicMaterial({ color: "#07060c" })));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.15;
    scene.add(floor);
    const railMat = keep(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    const rail = new THREE.Mesh(keep(new THREE.RingGeometry(R - 0.12, R - 0.02, 160, 1, Math.PI / 2 - 1.6, 3.2)), railMat);
    rail.rotation.x = -Math.PI / 2;
    rail.position.set(0, -2.12, 4);
    scene.add(rail);

    // ---- cards (and their reflections) in fixed slots; textures move between slots as it turns
    const loader = new THREE.TextureLoader();
    const tex = items.map((it) => {
      const t = keep(loader.load(it.img));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    });
    const cardGeo = keep(new THREE.PlaneGeometry(W, H));
    const glowGeo = keep(new THREE.PlaneGeometry(W + 1.2, H + 1.2));
    type Slot = { j: number; card: THREE.Mesh; refl: THREE.Mesh; glow: THREE.Mesh; mats: THREE.ShaderMaterial[] };
    const slots: Slot[] = [];
    for (let j = -SLOTS; j <= SLOTS; j++) {
      const mk = (reflection: number) => keep(new THREE.ShaderMaterial({
        transparent: true, vertexShader: vert, fragmentShader: cardFrag,
        uniforms: { map: { value: tex[0] }, focus: { value: 0 }, accent: { value: accent }, reflection: { value: reflection }, time: { value: 0 } },
      }));
      const m1 = mk(0), m2 = mk(1);
      const gm = keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: vert, fragmentShader: glowFrag, uniforms: { accent: { value: accent }, focus: { value: 0 } } }));
      const card = new THREE.Mesh(cardGeo, m1), refl = new THREE.Mesh(cardGeo, m2), glow = new THREE.Mesh(glowGeo, gm);
      card.userData.j = j;
      refl.scale.y = -1;
      scene.add(glow, card, refl);
      slots.push({ j, card, refl, glow, mats: [m1, m2, gm] });
    }

    // ---- post-processing glow
    let composer: EffectComposer | null = null;
    if (hi) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 0.55, 0.5, 0.86));
      composer.addPass(new OutputPass());
    }

    // ---- input: wheel, drag, keys, click
    const n = items.length;
    let o = 0, target_o = 0, lastActive = -1, idle = 0;
    const mod = (a: number) => ((a % n) + n) % n;
    apiRef.current = {
      goTo: (i) => { const cur = mod(Math.round(target_o)); let d = i - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n; target_o += d; },
      step: (d) => { target_o = Math.round(target_o) + d; },
    };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); target_o += (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * 0.0045; idle = 0; };
    let drag: { x: number; o: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => { drag = { x: e.clientX, o: target_o, moved: false }; };
    const onMoveDrag = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      target_o = drag.o - dx / 260;
      idle = 0;
    };
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const onUp = (e: PointerEvent) => {
      if (!drag) return; // only clicks that started on the scene
      const wasDrag = drag.moved;
      drag = null;
      if (wasDrag) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(slots.map((s) => s.card))[0];
      if (!hit) return;
      const j = hit.object.userData.j as number;
      const idx = mod(Math.round(o) + j);
      if (j === 0) cb.current.onOpen(idx);
      else target_o = Math.round(o) + j;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") target_o = Math.round(target_o) + 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") target_o = Math.round(target_o) - 1;
      if (e.key === "Enter") cb.current.onOpen(mod(Math.round(o)));
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMoveDrag);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      composer?.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let last = 0, raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const now = clock.getElapsedTime(), dt = Math.min(0.1, now - last);
      last = now;
      idle += dt;
      if (idle > 0.18 && !drag) target_o += (Math.round(target_o) - target_o) * (1 - Math.exp(-dt * 8)); // snap
      o += (target_o - o) * (1 - Math.exp(-dt * 7));
      const base = Math.round(o), frac = o - base;
      const active = mod(base);
      if (active !== lastActive) { lastActive = active; target.set(items[active].accent); cb.current.onActive(active); }
      accent.lerp(target, 1 - Math.exp(-dt * 4));
      for (const s of slots) {
        const k = s.j - frac, a = k * STEP;
        const x = Math.sin(a) * R, z = 4 - Math.cos(a) * R;
        const focus = Math.max(0, 1 - Math.abs(k));
        const sc = 1 + focus * 0.08;
        s.card.position.set(x, 0.1 + focus * 0.06, z);
        s.card.rotation.y = -a;
        s.card.scale.set(sc, sc, 1);
        s.refl.position.set(x, -4.42 - focus * 0.06, z);
        s.refl.rotation.y = -a;
        s.refl.scale.set(sc, -sc, 1);
        s.glow.position.set(Math.sin(a) * (R + 0.05), 0.1, 4 - Math.cos(a) * (R + 0.05));
        s.glow.rotation.y = -a;
        s.glow.scale.set(sc, sc, 1);
        const t = tex[mod(base + s.j)];
        for (const m of s.mats) {
          if (m.uniforms.map && m.uniforms.map.value !== t) m.uniforms.map.value = t;
          m.uniforms.focus.value = focus;
        }
        const vis = Math.abs(k) < SLOTS - 0.5;
        s.card.visible = s.refl.visible = s.glow.visible = vis;
      }
      beamMat.color.copy(accent);
      railMat.color.copy(accent);
      if (composer) composer.render();
      else renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      apiRef.current = null;
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMoveDrag);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      trash.forEach((d) => d.dispose());
      composer?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [items, quality, apiRef]);

  return <div ref={host} className="fixed inset-0 z-0 cursor-grab bg-[#040308] active:cursor-grabbing" />;
}
