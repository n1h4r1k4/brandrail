"use client";
// The Screens page's world (original, built in code with three.js): product screens ride a rail
// through a checkpoint gate. Incoming screens have an amber edge, the one in the gate is scanned,
// and screens that have passed carry a teal "verified" edge and stamp.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Quality } from "./world";

export interface ConveyorApi { goTo: (i: number) => void }

const CW = 3.6, CH = 2.25, D = 4.9;

const frag = `
  uniform sampler2D map; uniform float x; varying vec2 vUv;
  float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main(){
    vec2 p = (vUv - 0.5) * vec2(${CW.toFixed(2)}, ${CH.toFixed(2)});
    float d = box(p, vec2(${(CW / 2).toFixed(3)}, ${(CH / 2).toFixed(3)}), 0.1);
    if (d > 0.0) discard;
    vec3 c = texture2D(map, vUv).rgb;
    float focus = 1.0 - smoothstep(0.3, 1.2, abs(x) / ${D.toFixed(1)});
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(mix(vec3(lum), vec3(0.45, 0.5, 0.85), 0.3) * 0.45, c * 0.92, focus);
    float passed = smoothstep(0.4, -0.4, x);
    vec3 edgeCol = mix(vec3(0.98, 0.65, 0.15), vec3(0.18, 0.83, 0.75), passed);
    float edge = smoothstep(-0.06, 0.0, d);
    c = mix(c, edgeCol, edge);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;
const vert = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

function stampTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2dd4bf";
  g.beginPath();
  g.roundRect(0, 0, 256, 64, 32);
  g.fill();
  g.fillStyle = "#06302c";
  g.font = "bold 28px sans-serif";
  g.fillText("✓  VERIFIED", 34, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Conveyor({ images, quality, onActive, onOpen, apiRef }: {
  images: string[]; quality: Quality; onActive: (i: number) => void; onOpen: (i: number) => void; apiRef: React.RefObject<ConveyorApi | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onActive, onOpen });
  cb.current = { onActive, onOpen };

  useEffect(() => {
    const el = host.current;
    if (!el || !images.length) return;
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
    scene.background = new THREE.Color("#070b22");
    scene.fog = new THREE.Fog("#070b22", 12, 34);
    const camera = new THREE.PerspectiveCamera(44, el.clientWidth / el.clientHeight, 0.1, 100);
    const trash: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (trash.push(x), x);
    const basic = (color: string, o: Partial<THREE.MeshBasicMaterialParameters> = {}) => keep(new THREE.MeshBasicMaterial({ color, ...o }));

    // ---- floor, rail and the checkpoint gate
    const grid = new THREE.GridHelper(90, 90, "#1d2560", "#121842");
    grid.position.y = -1.9;
    keep(grid.geometry);
    keep(grid.material as THREE.Material);
    scene.add(grid);
    for (const z of [-0.7, 0.7]) {
      const rail = new THREE.Mesh(keep(new THREE.BoxGeometry(90, 0.022, 0.022)), basic("#4f46e5"));
      rail.position.set(0, -1.15, z);
      scene.add(rail);
    }
    const gate = new THREE.Group();
    scene.add(gate);
    const teal = basic("#2dd4bf");
    const post = keep(new THREE.BoxGeometry(0.09, 3.3, 0.09));
    for (const x of [-2.15, 2.15]) {
      const m = new THREE.Mesh(post, teal);
      m.position.set(x, 0.45, 0);
      gate.add(m);
    }
    const beam = new THREE.Mesh(keep(new THREE.BoxGeometry(4.39, 0.09, 0.09)), teal);
    beam.position.y = 2.1;
    gate.add(beam);
    const veil = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.2, 3.2)), basic("#2dd4bf", { transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
    veil.position.set(0, 0.45, 0.02);
    gate.add(veil);
    const scan = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.2, 0.04)), basic("#5eead4", { transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    scan.position.z = 0.6;
    gate.add(scan);

    // ---- screens on the rail
    const loader = new THREE.TextureLoader();
    const cardGeo = keep(new THREE.PlaneGeometry(CW, CH));
    const stampTex = keep(stampTexture());
    const stampGeo = keep(new THREE.PlaneGeometry(1.0, 0.25));
    const cards = images.map((src, i) => {
      const t = keep(loader.load(src));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      const mat = keep(new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { map: { value: t }, x: { value: 0 } } }));
      const m = new THREE.Mesh(cardGeo, mat);
      m.userData.i = i;
      const stampMat = keep(new THREE.MeshBasicMaterial({ map: stampTex, transparent: true, opacity: 0, depthWrite: false }));
      const stamp = new THREE.Mesh(stampGeo, stampMat);
      stamp.position.set(-CW / 2 + 0.62, CH / 2 + 0.22, 0.01);
      m.add(stamp);
      scene.add(m);
      return { m, mat, stampMat };
    });

    // ---- input
    const n = images.length;
    let o = 0, target = 0, last = -1;
    const clamp = (v: number) => Math.min(n - 1, Math.max(0, v));
    apiRef.current = { goTo: (i) => { target = clamp(i); } };
    let idle = 0;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); target = clamp(target + (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * 0.004); idle = 0; };
    let drag: { x: number; t: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => { drag = { x: e.clientX, t: target, moved: false }; };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      target = clamp(drag.t - dx / 240);
      idle = 0;
    };
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      if (moved) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(cards.map((c) => c.m), false)[0];
      if (!hit) return;
      const i = hit.object.userData.i as number;
      if (i === Math.round(o)) cb.current.onOpen(i);
      else target = i;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") target = clamp(Math.round(target) + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") target = clamp(Math.round(target) - 1);
      if (e.key === "Enter") cb.current.onOpen(Math.round(o));
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    const fit = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      // pull back on narrow screens so the gate and a neighbour stay in view
      const back = camera.aspect < 1 ? 15 : 8.6;
      camera.position.set(0, 1.5, back);
      camera.lookAt(0, -0.35, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    fit();
    window.addEventListener("resize", fit);

    const clock = new THREE.Clock();
    let lastT = 0, raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const now = clock.getElapsedTime(), dt = Math.min(0.1, now - lastT);
      lastT = now;
      idle += dt;
      if (idle > 0.2 && !drag) target += (Math.round(target) - target) * (1 - Math.exp(-dt * 8));
      o += (target - o) * (1 - Math.exp(-dt * 6));
      const active = Math.round(o);
      if (active !== last) { last = active; cb.current.onActive(active); }
      for (const [i, c] of cards.entries()) {
        const x = (i - o) * D;
        const inGate = 1 - Math.min(1, Math.abs(x) / D);
        c.m.position.set(x, 0.35 + inGate * 0.12, -Math.abs(x) * 0.12);
        c.m.rotation.y = -x * 0.05;
        c.mat.uniforms.x.value = x;
        c.stampMat.opacity = Math.min(1, Math.max(0, -x / 1.5));
      }
      scan.position.y = 0.45 + Math.sin(now * 2.2) * 1.4;
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      apiRef.current = null;
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fit);
      trash.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [images, quality, apiRef]);

  return <div ref={host} className="fixed inset-0 z-0 cursor-grab bg-[#070b22] active:cursor-grabbing" />;
}
