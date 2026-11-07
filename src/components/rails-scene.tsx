"use client";
// Brandrail's landing scene (original artwork, built with three.js):
// two glowing guardrails curve into a violet fog. Content cards travel along them and pass
// through a scanning checkpoint ring. Cards arrive flagged (amber) and leave verified (teal).
// The camera drifts with the mouse and travels along the rails as the page scrolls.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

type Variant = "doc" | "post" | "mail";

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** A tiny content card drawn on a canvas: flagged (amber highlight) or verified (teal check). */
function cardTexture(variant: Variant, verified: boolean) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 336;
  const g = c.getContext("2d")!;
  roundRect(g, 4, 4, 248, 328, 22);
  g.fillStyle = "#f8f7ff";
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = verified ? "#2dd4bf" : "#f59e0b";
  g.stroke();
  // header
  g.fillStyle = "#e9e7fb";
  roundRect(g, 22, 22, 212, 26, 8);
  g.fill();
  g.fillStyle = "#6366f1";
  g.beginPath();
  g.arc(36, 35, 6, 0, Math.PI * 2);
  g.fill();
  // badge
  g.fillStyle = verified ? "#ccfbf1" : "#fef3c7";
  roundRect(g, 150, 60, 86, 24, 12);
  g.fill();
  g.fillStyle = verified ? "#0f766e" : "#b45309";
  g.font = "bold 13px Arial";
  g.fillText(verified ? "✓ VERIFIED" : "! FLAGGED", 160, 77);
  // body
  let y = 104;
  if (variant === "post") {
    const grad = g.createLinearGradient(22, 100, 234, 190);
    grad.addColorStop(0, "#fb923c");
    grad.addColorStop(1, "#8b5cf6");
    g.fillStyle = grad;
    roundRect(g, 22, 100, 212, 90, 12);
    g.fill();
    y = 214;
  }
  const lines = variant === "mail" ? 8 : variant === "post" ? 4 : 7;
  for (let i = 0; i < lines; i++) {
    const w = i % 3 === 2 ? 140 : 200;
    const hl = i === (variant === "post" ? 1 : 3);
    if (hl) {
      g.fillStyle = verified ? "#99f6e4" : "#fde68a";
      roundRect(g, 18, y - 6, w + 8, 20, 5);
      g.fill();
    }
    g.fillStyle = hl ? (verified ? "#0f766e" : "#b45309") : "#c7c4e6";
    roundRect(g, 22, y, w, 8, 4);
    g.fill();
    y += 26;
  }
  if (verified) {
    g.fillStyle = "#14b8a6";
    g.beginPath();
    g.arc(214, 300, 18, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "white";
    g.lineWidth = 5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(205, 300);
    g.lineTo(212, 307);
    g.lineTo(224, 293);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function RailsScene({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL: the CSS gradient behind stays visible
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07061a");
    scene.fog = new THREE.FogExp2("#0d0a2b", 0.034);
    const camera = new THREE.PerspectiveCamera(48, el.clientWidth / el.clientHeight, 0.1, 220);

    // ---- rails along a gentle S-curve
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-34, -2.4, 26),
      new THREE.Vector3(-16, -1.8, 10),
      new THREE.Vector3(-3, -1.4, -1),
      new THREE.Vector3(8, -1.5, -14),
      new THREE.Vector3(14, -1.9, -32),
      new THREE.Vector3(28, -2.6, -60),
    ]);
    const up = new THREE.Vector3(0, 1, 0);
    const offsetCurve = (side: number) =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: 160 }, (_, i) => {
          const t = i / 159;
          const p = path.getPointAt(t);
          const right = path.getTangentAt(t).cross(up).normalize();
          return p.add(right.multiplyScalar(side * 1.05));
        }),
      );
    const disposables: { dispose: () => void }[] = [];
    const railMat = (color: string) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6) });
      disposables.push(m);
      return m;
    };
    for (const [side, color] of [[-1, "#818cf8"], [1, "#a78bfa"]] as const) {
      const geo = new THREE.TubeGeometry(offsetCurve(side), 600, 0.055, 8, false);
      disposables.push(geo);
      scene.add(new THREE.Mesh(geo, railMat(color)));
    }
    // sleepers
    const sleeperGeo = new THREE.BoxGeometry(2.6, 0.06, 0.14);
    const sleeperMat = new THREE.MeshStandardMaterial({ color: "#1e1b4b", emissive: "#312e81", emissiveIntensity: 0.35, roughness: 0.6 });
    disposables.push(sleeperGeo, sleeperMat);
    const count = 220;
    const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, count);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const p = path.getPointAt(t);
      const tan = path.getTangentAt(t);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(tan.x, 0, tan.z).normalize());
      m4.compose(p.clone().add(new THREE.Vector3(0, -0.06, 0)), q, new THREE.Vector3(1, 1, 1));
      sleepers.setMatrixAt(i, m4);
    }
    scene.add(sleepers);

    // floor grid
    const grid = new THREE.GridHelper(220, 110, "#3b2f7a", "#1f1a4d");
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = -2.9;
    scene.add(grid);
    disposables.push(grid.geometry, grid.material as THREE.Material);

    // ---- checkpoint ring at the middle of the rails
    const gateT = 0.42;
    const gatePos = path.getPointAt(gateT).add(new THREE.Vector3(0, 1.4, 0));
    const gateDir = path.getTangentAt(gateT);
    const gate = new THREE.Group();
    gate.position.copy(gatePos);
    gate.lookAt(gatePos.clone().add(gateDir));
    const ringGeo = new THREE.TorusGeometry(2.6, 0.06, 16, 160);
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#5eead4").multiplyScalar(2.2) });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const ring2Geo = new THREE.TorusGeometry(3.05, 0.015, 8, 160);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#a5b4fc").multiplyScalar(1.4), transparent: true, opacity: 0.7 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    const scanGeo = new THREE.CircleGeometry(2.55, 64);
    const scanMat = new THREE.MeshBasicMaterial({ color: "#2dd4bf", transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
    const scan = new THREE.Mesh(scanGeo, scanMat);
    gate.add(ring, ring2, scan);
    scene.add(gate);
    disposables.push(ringGeo, ringMat, ring2Geo, ring2Mat, scanGeo, scanMat);

    // giant faint halo far behind
    const haloGeo = new THREE.TorusGeometry(26, 0.12, 8, 200);
    const haloMat = new THREE.MeshBasicMaterial({ color: "#4c1d95", transparent: true, opacity: 0.55 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(10, 8, -70);
    scene.add(halo);
    disposables.push(haloGeo, haloMat);

    // ---- content cards
    const variants: Variant[] = ["doc", "post", "mail"];
    const flagged = variants.map((v) => cardTexture(v, false));
    const verified = variants.map((v) => cardTexture(v, true));
    disposables.push(...flagged, ...verified);
    const cardGeo = new THREE.PlaneGeometry(1.5, 1.97);
    disposables.push(cardGeo);
    const cards = Array.from({ length: 11 }, (_, i) => {
      const mat = new THREE.MeshBasicMaterial({ map: flagged[i % 3], color: new THREE.Color(0.78, 0.78, 0.82), transparent: true, side: THREE.DoubleSide, fog: true });
      disposables.push(mat);
      const mesh = new THREE.Mesh(cardGeo, mat);
      const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#f59e0b").multiplyScalar(1.5), transparent: true, opacity: 0.3 });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 2.09), glowMat);
      disposables.push(glowMat, glow.geometry);
      glow.position.z = -0.01;
      const group = new THREE.Group();
      group.add(glow, mesh);
      scene.add(group);
      return { group, mat, glowMat, variant: i % 3, offset: i / 11, wobble: Math.random() * Math.PI * 2 };
    });

    // ---- particles
    const pCount = 1600;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 30 - 3;
      pos[i * 3 + 2] = (Math.random() - 0.7) * 120;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: "#c4b5fd", size: 0.07, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);
    disposables.push(pGeo, pMat);

    // lights for the standard materials
    scene.add(new THREE.AmbientLight("#6d5dfc", 0.6));
    const pl = new THREE.PointLight("#2dd4bf", 30, 30);
    pl.position.copy(gatePos);
    scene.add(pl);

    // ---- post-processing (bloom)
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 0.75, 0.45, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ---- interaction
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    let scrollT = 0;
    let scrollTarget = 0;
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollTarget = Math.min(1, window.scrollY / max);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      composer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    const camPos = new THREE.Vector3();
    const look = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    let raf = 0;

    const frame = () => {
      const t = reduced ? 8 : clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      scrollT += (scrollTarget - scrollT) * 0.06;

      // camera travels along the rails with scroll, looking a little ahead
      const ct = 0.12 + scrollT * 0.5;
      camPos.copy(path.getPointAt(ct));
      const side = path.getTangentAt(ct).cross(up).normalize();
      camPos.add(side.multiplyScalar(-4.6 + mouse.x * 1.4)).add(new THREE.Vector3(0, 3.1 - mouse.y * 0.8 + scrollT * 1.5, 0));
      camera.position.copy(camPos);
      look.copy(path.getPointAt(Math.min(1, ct + 0.16))).add(new THREE.Vector3(0, 1.2, 0));
      camera.lookAt(look);

      // cards glide along the rails; they change state as they pass the checkpoint
      for (const c of cards) {
        const ctT = (c.offset + t * 0.012) % 1;
        const p = path.getPointAt(ctT);
        c.group.position.copy(p).add(new THREE.Vector3(0, 1.45 + Math.sin(t * 1.3 + c.wobble) * 0.08, 0));
        tmp.copy(camera.position).setY(c.group.position.y);
        c.group.lookAt(tmp);
        const passed = ctT > gateT;
        const map = passed ? verified[c.variant] : flagged[c.variant];
        if (c.mat.map !== map) {
          c.mat.map = map;
          c.mat.needsUpdate = true;
          c.glowMat.color.set(passed ? "#2dd4bf" : "#f59e0b").multiplyScalar(1.5);
        }
        const nearGate = Math.max(0, 1 - Math.abs(ctT - gateT) / 0.025);
        c.glowMat.opacity = 0.25 + nearGate * 0.6;
      }

      // checkpoint pulse
      const pulse = (Math.sin(t * 2.2) + 1) / 2;
      scanMat.opacity = 0.05 + pulse * 0.1;
      ring2.rotation.z = t * 0.3;
      ring2.scale.setScalar(1 + pulse * 0.04);
      halo.rotation.z = t * 0.02;
      points.rotation.y = t * 0.01;

      composer.render();
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    frame();

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);
    // In reduced-motion mode, re-render on scroll so the camera still follows.
    const onReducedScroll = () => { if (reduced) frame(); };
    window.addEventListener("scroll", onReducedScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onReducedScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      disposables.forEach((d) => d.dispose());
      sleepers.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className={className} aria-hidden="true" />;
}
