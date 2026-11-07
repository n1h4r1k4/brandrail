"use client";
// The About page's world (original, built in code with three.js): a dark violet studio with a
// glowing tree, a lamp, a sofa, a table with a laptop, a boulder and a curved window that looks
// out over the meadow. The camera moves through it as you scroll.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Quality } from "./world";

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function meadowTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 640;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, "#a998e6");
  sky.addColorStop(1, "#e7c4ee");
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 640);
  const r = rand(4);
  for (let i = 0; i < 18; i++) {
    const x = r() * 2048, y = 60 + r() * 200, rad = 60 + r() * 120;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, "rgba(246,190,230,0.55)");
    grd.addColorStop(1, "rgba(246,190,230,0)");
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // standing stones on the horizon
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * 2048 + r() * 40, w = 50 + r() * 60, h = 90 + r() * 140, base = 430;
    g.fillStyle = ["#7f6a92", "#8d779e", "#6f5c84"][i % 3];
    g.beginPath();
    g.moveTo(x, base);
    g.lineTo(x + w * 0.1, base - h * 0.8);
    g.lineTo(x + w * 0.45, base - h);
    g.lineTo(x + w * 0.9, base - h * 0.75);
    g.lineTo(x + w, base);
    g.fill();
  }
  // lake and grass
  g.fillStyle = "#b9a3e6";
  g.fillRect(0, 430, 2048, 70);
  g.fillStyle = "#6b21a8";
  g.fillRect(0, 495, 2048, 145);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 2048, y = 470 + r() * 170, h = 10 + r() * 34;
    g.strokeStyle = r() < 0.5 ? "#7e22ce" : "#9d4edd";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 8, y - h);
    g.stroke();
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
  grd.addColorStop(0, "rgba(255,230,245,1)");
  grd.addColorStop(0.25, "rgba(255,190,235,0.45)");
  grd.addColorStop(1, "rgba(255,190,235,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function screenTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 256, 160);
  grd.addColorStop(0, "#3b0f7a");
  grd.addColorStop(0.55, "#a21caf");
  grd.addColorStop(1, "#f472b6");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 160);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const KEYS = [
  { cam: [-2.5, 2.3, 10], look: [1.5, 1.3, -4] },
  { cam: [0.5, 1.7, 5.5], look: [2.5, 1.1, -3] },
  { cam: [3, 2.2, 3], look: [-6, 2.8, -6] },
  { cam: [-2, 1.6, 1.5], look: [6.5, 1.0, 1.5] },
  { cam: [-3, 1.9, 0], look: [9, 1.8, -8] },
];

export function Room({ quality, containerId }: { quality: Quality; containerId: string }) {
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#120a2a");
    scene.fog = new THREE.FogExp2("#170d36", 0.03);
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
    const trash: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (trash.push(x), x);
    const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));

    // ---- light
    scene.add(new THREE.HemisphereLight("#7d6bd8", "#0b0618", 0.9));
    const win = new THREE.DirectionalLight("#d9c6ff", 1.4);
    win.position.set(12, 6, -10);
    scene.add(win);

    // ---- room: floor, curved wall and the window onto the meadow
    const floor = new THREE.Mesh(keep(new THREE.CircleGeometry(17, 64)), mat("#1a0f38", { roughness: 0.55, metalness: 0.25 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const wall = new THREE.Mesh(keep(new THREE.CylinderGeometry(16, 16, 12, 64, 1, true)), mat("#1e1243", { side: THREE.BackSide, roughness: 0.95 }));
    wall.position.y = 6;
    scene.add(wall);
    const meadow = keep(meadowTexture());
    const winGeo = keep(new THREE.CylinderGeometry(15.85, 15.85, 4.6, 48, 1, true, 2.356 - 0.75, 1.5));
    const winMesh = new THREE.Mesh(winGeo, keep(new THREE.MeshBasicMaterial({ map: meadow, side: THREE.BackSide, fog: false })));
    winMesh.position.y = 3.2;
    scene.add(winMesh);
    const frame = new THREE.Mesh(keep(new THREE.CylinderGeometry(15.8, 15.8, 0.12, 48, 1, true, 2.356 - 0.78, 1.56)), mat("#0d0820", { side: THREE.BackSide }));
    frame.position.y = 0.85;
    scene.add(frame);
    const frameTop = frame.clone();
    frameTop.position.y = 5.55;
    scene.add(frameTop);

    // ---- the tree: a curved trunk, branches and thousands of violet leaves
    const tree = new THREE.Group();
    tree.position.set(-6, 0, -6);
    scene.add(tree);
    const bark = mat("#2b1838", { roughness: 1 });
    const limb = (pts: number[][], r: number) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      tree.add(new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 24, r, 8)), bark));
      return curve;
    };
    limb([[0, 0, 0], [0.2, 1.5, 0], [-0.1, 3, 0.1], [0.1, 4.2, 0]], 0.32);
    const tips: THREE.Vector3[] = [];
    const rl = rand(17);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, len = 2 + rl() * 1.6;
      const start = [0.1, 3 + rl() * 1.2, 0];
      const end = [Math.cos(a) * len, 4.6 + rl() * 1.8, Math.sin(a) * len * 0.8];
      limb([start, [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.5, (start[2] + end[2]) / 2], end], 0.09);
      tips.push(new THREE.Vector3(end[0], end[1], end[2]));
    }
    tips.push(new THREE.Vector3(0, 6.2, 0));
    const leafCount = hi ? 9000 : 3500;
    const leafGeo = keep(new THREE.PlaneGeometry(0.22, 0.14));
    const leafMat = keep(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, emissive: "#2e1065", emissiveIntensity: 0.6 }));
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const leafPal = ["#4c1d95", "#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6", "#3b0f7a"];
    for (let i = 0; i < leafCount; i++) {
      const tip = tips[Math.floor(rl() * tips.length)];
      const u = rl() * 2 - 1, th = rl() * Math.PI * 2, rad = 1.9 * Math.cbrt(rl());
      const s = Math.sqrt(1 - u * u);
      dummy.position.set(tip.x + rad * s * Math.cos(th) * 1.3, tip.y + rad * u * 0.7, tip.z + rad * s * Math.sin(th) * 1.2);
      dummy.rotation.set(rl() * Math.PI, rl() * Math.PI, rl() * Math.PI);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(i, col.set(leafPal[Math.floor(rl() * leafPal.length)]));
    }
    tree.add(leaves);

    // ---- lamp
    const lamp = new THREE.Group();
    lamp.position.set(-2.6, 0, -2.8);
    scene.add(lamp);
    const pole = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8)), mat("#9b8ca8", { metalness: 0.6, roughness: 0.3 }));
    pole.position.y = 1.1;
    lamp.add(pole);
    const bulb = new THREE.Mesh(keep(new THREE.SphereGeometry(0.28, 24, 16)), keep(new THREE.MeshBasicMaterial({ color: "#fff3fb" })));
    bulb.position.set(0.25, 2.25, 0);
    lamp.add(bulb);
    const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(glowTexture()), color: "#ffc2ea", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    glow.scale.set(2.6, 2.6, 1);
    glow.position.copy(bulb.position);
    lamp.add(glow);
    const lampLight = new THREE.PointLight("#ffc9ec", 9, 9, 1.6);
    lampLight.position.copy(bulb.position);
    lamp.add(lampLight);

    // ---- table, laptop and chairs
    const wood = mat("#3a2630", { roughness: 0.6 });
    const table = new THREE.Mesh(keep(new RoundedBoxGeometry(4.2, 0.12, 1.7, 3, 0.04)), wood);
    table.position.set(2.5, 0.95, -3);
    scene.add(table);
    for (const [dx, dz] of [[-1.7, -0.6], [1.7, -0.6], [-1.7, 0.6], [1.7, 0.6]]) {
      const leg = new THREE.Mesh(keep(new THREE.BoxGeometry(0.1, 0.9, 0.1)), wood);
      leg.position.set(2.5 + dx, 0.45, -3 + dz);
      scene.add(leg);
    }
    const laptop = new THREE.Group();
    laptop.position.set(1.8, 1.02, -2.9);
    laptop.rotation.y = 0.35;
    scene.add(laptop);
    laptop.add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.9, 0.03, 0.6)), mat("#b9b3c6", { metalness: 0.7, roughness: 0.3 })));
    const lid = new THREE.Mesh(keep(new THREE.BoxGeometry(0.9, 0.6, 0.02)), keep(new THREE.MeshBasicMaterial({ map: keep(screenTexture()) })));
    lid.position.set(0, 0.3, -0.3);
    lid.rotation.x = -0.25;
    laptop.add(lid);
    const chairMat = mat("#241830", { roughness: 0.5 });
    for (const [x, z, ry] of [[1.2, -1.7, Math.PI], [3.6, -1.7, Math.PI], [1.4, -4.3, 0], [3.6, -4.3, 0]]) {
      const ch = new THREE.Group();
      ch.position.set(x, 0, z);
      ch.rotation.y = ry;
      const seat = new THREE.Mesh(keep(new RoundedBoxGeometry(0.6, 0.08, 0.6, 2, 0.03)), chairMat);
      seat.position.y = 0.55;
      const back = new THREE.Mesh(keep(new RoundedBoxGeometry(0.6, 0.6, 0.06, 2, 0.03)), chairMat);
      back.position.set(0, 0.85, -0.28);
      ch.add(seat, back);
      for (const [lx, lz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
        const l = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6)), chairMat);
        l.position.set(lx, 0.27, lz);
        ch.add(l);
      }
      scene.add(ch);
    }

    // ---- sofa along the wall
    const sofaMat = mat("#2a1f36", { roughness: 0.55 });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Group();
      seg.position.set(7.2, 0, 3.2 - i * 1.25);
      seg.rotation.y = -Math.PI / 2;
      const seat = new THREE.Mesh(keep(new RoundedBoxGeometry(1.2, 0.4, 1.0, 3, 0.12)), sofaMat);
      seat.position.y = 0.3;
      const back = new THREE.Mesh(keep(new RoundedBoxGeometry(1.2, 0.6, 0.3, 3, 0.12)), sofaMat);
      back.position.set(0, 0.65, -0.45);
      seg.add(seat, back);
      scene.add(seg);
    }

    // ---- boulder
    const rockGeo = keep(new THREE.IcosahedronGeometry(1, 4));
    const rp = rockGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < rp.count; i++) {
      v.fromBufferAttribute(rp, i);
      const n = 1 + 0.12 * Math.sin(v.x * 3.1 + v.y * 1.7) + 0.08 * Math.sin(v.z * 5.3 - v.x * 2.2) + 0.05 * Math.sin(v.y * 9.1);
      rp.setXYZ(i, v.x * n, v.y * n, v.z * n);
    }
    rockGeo.computeVertexNormals();
    const rock = new THREE.Mesh(rockGeo, mat("#6e6578", { roughness: 1 }));
    rock.scale.set(2.6, 1.3, 1.8);
    rock.position.set(0.5, 0.9, -8.5);
    rock.rotation.set(0.1, 0.6, -0.15);
    scene.add(rock);

    // ---- drifting dust
    const dustN = hi ? 700 : 300, dp = new Float32Array(dustN * 3), rd = rand(23);
    for (let i = 0; i < dustN; i++) dp.set([(rd() - 0.5) * 26, rd() * 7, (rd() - 0.5) * 26], i * 3);
    const dustGeo = keep(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dustGeo, keep(new THREE.PointsMaterial({ color: "#d8ccff", size: 0.06, map: keep(glowTexture()), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })));
    scene.add(dust);

    // ---- scroll, mouse, resize
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove);
    const progress = () => {
      const c = document.getElementById(containerId);
      if (!c) return 0;
      const r = c.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      return Math.min(KEYS.length - 1, Math.max(0, (-r.top / span) * (KEYS.length - 1)));
    };
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);
    const showing = new Set<Element>();
    let visible = true;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) showing.add(e.target); else showing.delete(e.target); }
      visible = showing.size > 0;
    });
    const container = document.getElementById(containerId);
    if (container) io.observe(container);

    const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
    const camPos = new THREE.Vector3(), look = new THREE.Vector3();
    const clock = new THREE.Clock();
    let p = progress(), last = 0, raf = 0;
    const frame_ = () => {
      raf = requestAnimationFrame(frame_);
      if (!visible || document.hidden) return;
      const now = clock.getElapsedTime(), dt = Math.min(0.5, now - last);
      last = now;
      const ease = (k: number) => 1 - Math.exp(-dt * k);
      mouse.x += (mouse.tx - mouse.x) * ease(3);
      mouse.y += (mouse.ty - mouse.y) * ease(3);
      p += (progress() - p) * ease(4.5);
      const i0 = Math.floor(p), i1 = Math.min(KEYS.length - 1, i0 + 1), f = p - i0;
      const s = f * f * (3 - 2 * f);
      camPos.copy(v3(KEYS[i0].cam)).lerp(v3(KEYS[i1].cam), s).add(new THREE.Vector3(mouse.x * 0.6, -mouse.y * 0.3, 0));
      look.copy(v3(KEYS[i0].look)).lerp(v3(KEYS[i1].look), s);
      camera.position.copy(camPos);
      camera.lookAt(look);
      tree.rotation.z = Math.sin(now * 0.6) * 0.012;
      leaves.rotation.y = Math.sin(now * 0.4) * 0.02;
      dust.rotation.y = now * 0.01;
      lampLight.intensity = 8.5 + Math.sin(now * 2.1) * 0.4;
      renderer.render(scene, camera);
    };
    frame_();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      trash.forEach((d) => d.dispose());
      leaves.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [quality, containerId]);

  return <div ref={host} className="fixed inset-0 z-0" style={{ background: "radial-gradient(80% 60% at 60% 40%, #2a1660 0%, #120a2a 60%, #07040f 100%)" }} aria-hidden="true" />;
}
