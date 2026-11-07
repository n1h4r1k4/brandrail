"use client";
// Brandrail's landing world (original, built in code with three.js):
// a lavender meadow with wind-blown grass, low-poly rocks and a reflective lake, drifting clouds,
// rounded standing stones, floating leaves, and a particle sculpture that morphs between
// Brandrail shapes as you scroll (shield → globe → checkpoint ring → heart → check mark).
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export type Theme = "day" | "night";
export type Quality = "high" | "low";

const PALETTE = {
  day: {
    zenith: "#7d8cf0", horizon: "#ffd6c4", fog: "#c9c4ec", fogDensity: 0.0105,
    grassBase: "#1c1a5c", grassTip: "#6170f2", ground: "#222071", sand: "#c4c0db",
    rock: "#6d7691", water: "#b4c2f6", hemiSky: "#f2eeff", hemiGround: "#2c3192", sun: "#ffe2cc",
    cloud: 0.85, leaf: "#262b66", rail: "#4f46e5", sculptureAdditive: false,
  },
  night: {
    zenith: "#050816", horizon: "#1b2559", fog: "#10163d", fogDensity: 0.018,
    grassBase: "#0b0f33", grassTip: "#3740a8", ground: "#0e1238", sand: "#2b3263",
    rock: "#242a52", water: "#232c6b", hemiSky: "#4b56b8", hemiGround: "#070a22", sun: "#a5b4fc",
    cloud: 0.18, leaf: "#7c89e8", rail: "#a5b4fc", sculptureAdditive: true,
  },
};

const LAKE = { x: 2, z: -6, rx: 15, rz: 9 };
const WATER_Y = -0.55;

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function terrainH(x: number, z: number) {
  let h = Math.sin(x * 0.08) * 0.8 + Math.cos(z * 0.07) * 0.7 + Math.sin((x + z) * 0.05) * 1.1 + Math.sin(x * 0.21 + z * 0.13) * 0.25;
  h += Math.max(0, (-z - 30) * 0.06); // land rises toward the far rocks
  const lx = (x - LAKE.x) / LAKE.rx, lz = (z - LAKE.z) / LAKE.rz;
  const d = Math.sqrt(lx * lx + lz * lz);
  return h + (-2.4 - h) * smooth(1.25, 0.8, d);
}

// ---------- particle sculpture shapes ----------
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shapes(n: number) {
  const r = rand(7);
  const shield = new Float32Array(n * 3), sphere = new Float32Array(n * 3), ring = new Float32Array(n * 3);
  const heart = new Float32Array(n * 3), check = new Float32Array(n * 3);
  const inShield = (x: number, y: number) => {
    // shield silhouette: flat top, curving to a point at the bottom
    if (y > 1.25 || y < -1.6) return false;
    const half = y > 0 ? 1.15 : 1.15 * Math.sqrt(Math.max(0, 1 - (y / -1.6) ** 1.6));
    return Math.abs(x) < half;
  };
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    do { x = r() * 2.4 - 1.2; y = r() * 2.9 - 1.6; } while (!inShield(x, y));
    shield.set([x * 2.4, y * 2.4, (r() - 0.5) * 0.9], i * 3);

    const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 3.1 * Math.cbrt(0.55 + 0.45 * r());
    const s = Math.sqrt(1 - u * u);
    sphere.set([rad * s * Math.cos(th), rad * u, rad * s * Math.sin(th)], i * 3);

    const a = r() * Math.PI * 2, b = r() * Math.PI * 2, R = 2.9, tube = 0.55 * Math.sqrt(r());
    ring.set([(R + tube * Math.cos(b)) * Math.cos(a), (R + tube * Math.cos(b)) * Math.sin(a), tube * Math.sin(b)], i * 3);

    const t = r() * Math.PI * 2, k = Math.sqrt(r());
    const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    heart.set([hx * 0.19 * k, hy * 0.19 * k + 0.4, (r() - 0.5) * 1.4 * (1 - k * 0.6)], i * 3);

    // check mark: two thick strokes
    const seg = r() < 0.38;
    const p = r();
    const cx = seg ? -2.2 + p * 1.6 : -0.6 + p * 3.4;
    const cy = seg ? 0.2 - p * 1.6 : -1.4 + p * 3.6;
    check.set([cx + (r() - 0.5) * 0.75, cy + (r() - 0.5) * 0.75, (r() - 0.5) * 0.8], i * 3);
  }
  return [shield, sphere, ring, heart, check];
}

function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = rand(3);
  for (let i = 0; i < 14; i++) {
    const rad = 26 + r() * 30;
    const x = 64 + r() * 128, y = 100 + r() * 56;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Camera and sculpture key frames, one per story section.
// cam[1] is the height above the local ground.
const KEYS = [
  { cam: [-2, 2.6, 28], look: [3, 5.5, -14], sc: [4, 8.5, -18], scale: 1.7 },
  { cam: [3, 3.0, 20], look: [9, 8, -6], sc: [15, 11, -8], scale: 2.3 },
  { cam: [6, 2.4, 17], look: [-11, 6.5, -4], sc: [-11, 9, -8], scale: 2.3 },
  { cam: [3, 2.6, 22], look: [-4, 5.5, -10], sc: [-16, 8, -11], scale: 1.6 },
  { cam: [0, 2.4, 25], look: [0, 6, -16], sc: [0, 8.2, -18], scale: 1.6 },
];

export function World({ theme, quality, sections = 5, containerId }: { theme: Theme; quality: Quality; sections?: number; containerId: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const P = PALETTE[theme];
    const hi = quality === "high";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: hi, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 1.5 : 1));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === "day" ? 1.05 : 1.0;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(P.fog, P.fogDensity);
    const camera = new THREE.PerspectiveCamera(52, el.clientWidth / el.clientHeight, 0.1, 900);
    const trash: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (trash.push(x), x);

    // ---- sky dome
    const skyMat = keep(new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { zen: { value: new THREE.Color(P.zenith) }, hor: { value: new THREE.Color(P.horizon) } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 zen; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y*1.4+0.06,0.0,1.0); gl_FragColor = vec4(mix(hor, zen, pow(h,0.75)),1.0);\n#include <colorspace_fragment>\n}",
    }));
    scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(600, 32, 16)), skyMat));

    // ---- lights
    scene.add(new THREE.HemisphereLight(P.hemiSky, P.hemiGround, 1.25));
    const sun = new THREE.DirectionalLight(P.sun, theme === "day" ? 1.4 : 0.6);
    sun.position.set(-30, 40, 20);
    scene.add(sun);

    // ---- ground
    const gGeo = keep(new THREE.PlaneGeometry(320, 320, hi ? 220 : 120, hi ? 220 : 120));
    gGeo.rotateX(-Math.PI / 2);
    const pos = gGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cGround = new THREE.Color(P.ground), cSand = new THREE.Color(P.sand), tmpC = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = terrainH(x, z);
      pos.setY(i, h);
      tmpC.copy(cGround).lerp(cSand, smooth(WATER_Y + 0.9, WATER_Y + 0.1, h));
      colors.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    }
    gGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    gGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(gGeo, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))));

    // ---- grass (instanced blades with wind in the vertex shader)
    const bladeCount = hi ? 90000 : 22000;
    const blade = new THREE.InstancedBufferGeometry();
    const segs = 4;
    const bv: number[] = [], bi: number[] = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, w = 0.036 * (1 - t * 0.9);
      bv.push(-w, t, 0, w, t, 0);
    }
    for (let s = 0; s < segs; s++) {
      const a = s * 2;
      bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    blade.setAttribute("position", new THREE.Float32BufferAttribute(bv, 3));
    blade.setIndex(bi);
    const offs = new Float32Array(bladeCount * 4);
    const rg = rand(11);
    let placed = 0;
    for (let tries = 0; placed < bladeCount && tries < bladeCount * 4; tries++) {
      const x = (rg() - 0.5) * 110, z = 34 - Math.pow(rg(), 1.5) * 90;
      const h = terrainH(x, z);
      if (h < WATER_Y + 0.25) continue;
      offs.set([x, h, z, rg()], placed * 4);
      placed++;
    }
    blade.instanceCount = placed;
    blade.setAttribute("offset", new THREE.InstancedBufferAttribute(offs, 4));
    keep(blade);
    const grassMat = keep(new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 }, base: { value: new THREE.Color(P.grassBase) }, tip: { value: new THREE.Color(P.grassTip) },
        fogColor: { value: new THREE.Color(P.fog) }, fogDensity: { value: P.fogDensity },
      },
      vertexShader: `
        attribute vec4 offset; uniform float time; varying float vT; varying float vDepth;
        void main(){
          float seed = offset.w;
          float h = 0.38 + seed * seed * 0.75;
          vec3 p = position; vT = p.y; p.y *= h;
          float ang = seed * 6.2831;
          p = vec3(p.x*cos(ang), p.y, p.x*sin(ang));
          float wind = sin(time*1.7 + offset.x*0.35 + offset.z*0.22) * 0.22 + sin(time*0.6 + offset.z*0.1) * 0.12;
          p.x += wind * vT * vT; p.z += wind * 0.5 * vT * vT;
          vec4 mv = modelViewMatrix * vec4(p + offset.xyz, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 base; uniform vec3 tip; uniform vec3 fogColor; uniform float fogDensity; varying float vT; varying float vDepth;
        void main(){
          vec3 c = mix(base, tip, vT);
          float f = 1.0 - exp(-fogDensity*fogDensity*vDepth*vDepth);
          gl_FragColor = vec4(mix(c, fogColor, clamp(f,0.0,1.0)), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    const grass = new THREE.Mesh(blade, grassMat);
    grass.frustumCulled = false;
    scene.add(grass);

    // ---- rounded standing stones: a ring behind the lake and scattered groups further out
    const rockMat = keep(new THREE.MeshStandardMaterial({ color: P.rock, flatShading: true, roughness: 0.9 }));
    const rr = rand(5);
    const stoneGeo = (seed: number) => {
      const g = keep(new THREE.IcosahedronGeometry(1, 2));
      const p2 = g.attributes.position as THREE.BufferAttribute;
      const r3 = rand(seed);
      for (let k = 0; k < p2.count; k++) {
        const j = 0.95 + r3() * 0.1;
        const y = p2.getY(k);
        p2.setXYZ(k, p2.getX(k) * j * (y > 0 ? 1 - y * 0.18 : 1), y * j, p2.getZ(k) * j * (y > 0 ? 1 - y * 0.18 : 1));
      }
      g.computeVertexNormals();
      return g;
    };
    const geos = Array.from({ length: 8 }, (_, i) => stoneGeo(40 + i));
    const addStone = (x: number, z: number, s: number, tall: number) => {
      const m = new THREE.Mesh(geos[Math.floor(rr() * geos.length)], rockMat);
      m.scale.set(s * (0.75 + rr() * 0.4), s * tall, s * (0.6 + rr() * 0.35));
      m.position.set(x, terrainH(x, z) + s * tall * 0.55, z);
      m.rotation.set((rr() - 0.5) * 0.2, rr() * Math.PI, (rr() - 0.5) * 0.25);
      scene.add(m);
    };
    for (let i = 0; i < (hi ? 46 : 26); i++) {
      // the ring behind the lake, like a row of old stones on the far shore
      const a = -Math.PI / 2 + (i / (hi ? 46 : 26) - 0.5) * 3.4 + (rr() - 0.5) * 0.08;
      const d = 24 + rr() * 6;
      addStone(LAKE.x + Math.cos(a) * d * 1.35, LAKE.z + Math.sin(a) * d * 0.75, 1.5 + rr() * 1.3, 1.0 + rr() * 0.9);
    }
    for (let i = 0; i < (hi ? 50 : 24); i++) {
      const a = rr() * Math.PI * 2, d = 58 + rr() * 50;
      addStone(LAKE.x + Math.cos(a) * d, LAKE.z + Math.sin(a) * d, 2.5 + rr() * 3.5, 0.9 + rr() * 1.0);
    }

    // ---- lake
    const lakeGeo = keep(new THREE.CircleGeometry(1, 64));
    let lake: THREE.Mesh;
    if (hi) {
      const refl = new Reflector(lakeGeo, { textureWidth: 512, textureHeight: 512, color: new THREE.Color(P.water), clipBias: 0.003 });
      lake = refl;
      trash.push({ dispose: () => refl.dispose() });
    } else {
      lake = new THREE.Mesh(lakeGeo, keep(new THREE.MeshStandardMaterial({ color: P.water, metalness: 0.6, roughness: 0.15, transparent: true, opacity: 0.92 })));
    }
    lake.rotation.x = -Math.PI / 2;
    lake.scale.set(LAKE.rx * 1.05, LAKE.rz * 1.05, 1);
    lake.position.set(LAKE.x, WATER_Y, LAKE.z);
    scene.add(lake);

    // ---- clouds
    const cloudTex = keep(cloudTexture());
    const clouds: THREE.Sprite[] = [];
    const rc = rand(9);
    for (let i = 0; i < (hi ? 26 : 12); i++) {
      const m = keep(new THREE.SpriteMaterial({ map: cloudTex, color: rc() < 0.6 ? "#ffe6d8" : "#ffffff", transparent: true, opacity: P.cloud * (0.6 + rc() * 0.4), depthWrite: false, fog: false }));
      const s = new THREE.Sprite(m);
      const sc = 60 + rc() * 90;
      s.scale.set(sc * 1.6, sc, 1);
      s.position.set((rc() - 0.5) * 520, 40 + rc() * 70, -160 - rc() * 260);
      scene.add(s);
      clouds.push(s);
    }

    // ---- stars (night)
    if (theme === "night") {
      const n = 1800, sp = new Float32Array(n * 3), rs = rand(13);
      for (let i = 0; i < n; i++) {
        const th = rs() * Math.PI * 2, ph = Math.acos(rs() * 0.9);
        sp.set([Math.sin(ph) * Math.cos(th) * 500, Math.cos(ph) * 500, Math.sin(ph) * Math.sin(th) * 500], i * 3);
      }
      const sg = keep(new THREE.BufferGeometry());
      sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, keep(new THREE.PointsMaterial({ color: "#e0dbff", size: 1.4, sizeAttenuation: false, fog: false }))));
    }

    // ---- floating leaves
    const leafGeo = keep(new THREE.PlaneGeometry(0.16, 0.09));
    const leafMat = keep(new THREE.MeshBasicMaterial({ color: P.leaf, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    const leaves = Array.from({ length: hi ? 160 : 60 }, (_, i) => {
      const m = new THREE.Mesh(leafGeo, leafMat);
      const r2 = rand(100 + i);
      m.position.set((r2() - 0.5) * 40, 1 + r2() * 12, 30 - r2() * 50);
      scene.add(m);
      return { m, sx: 0.2 + r2() * 0.5, sy: r2() * 0.3, ph: r2() * 10, rot: r2() * 2 };
    });

    // ---- particle sculpture
    const N = hi ? 4200 : 2200;
    const S = shapes(N);
    const sGeo = keep(new THREE.BufferGeometry());
    const sPos = new Float32Array(N * 3);
    const sCol = new Float32Array(N * 3);
    const sSize = new Float32Array(N);
    const palette = theme === "day" ? ["#818cf8", "#a5b4fc", "#6366f1", "#2dd4bf", "#5eead4", "#ffffff", "#c7d2fe"] : ["#a5b4fc", "#818cf8", "#2dd4bf", "#5eead4", "#ffffff"];
    const rp = rand(21);
    for (let i = 0; i < N; i++) {
      const c = new THREE.Color(palette[Math.floor(rp() * palette.length)]);
      sCol.set([c.r, c.g, c.b], i * 3);
      sSize[i] = 0.7 + rp() * 1.1;
    }
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute("size", new THREE.BufferAttribute(sSize, 1));
    const sMat = keep(new THREE.ShaderMaterial({
      transparent: true, depthWrite: !P.sculptureAdditive,
      blending: P.sculptureAdditive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { scale: { value: el.clientHeight * 0.24 } },
      vertexShader: `attribute vec3 color; attribute float size; uniform float scale; varying vec3 vC;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        // shade each point like a small glossy ball lit from the top left
        vec3 n = vec3(d.x * 2.0, -d.y * 2.0, sqrt(max(0.0, 1.0 - 4.0 * r * r)));
        float diff = clamp(dot(n, normalize(vec3(-0.5, 0.6, 0.8))), 0.0, 1.0);
        float spec = pow(clamp(dot(reflect(-normalize(vec3(-0.5, 0.6, 0.8)), n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 18.0);
        vec3 col = vC * (0.55 + 0.6 * diff) + vec3(spec * 0.55);
        gl_FragColor = vec4(col, smoothstep(0.5, 0.44, r));
        #include <colorspace_fragment>
        }`,
    }));
    const sculpture = new THREE.Points(sGeo, sMat);
    sculpture.frustumCulled = false;
    scene.add(sculpture);
    const jitter = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) jitter[i] = rp() - 0.5;

    // ---- post-processing
    let composer: EffectComposer | null = null;
    if (theme === "night" && hi) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 0.8, 0.5, 0.7));
      composer.addPass(new OutputPass());
    }

    // ---- interaction & scroll
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    const progress = () => {
      const c = document.getElementById(containerId);
      if (!c) return 0;
      const r = c.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      return Math.min(sections - 1, Math.max(0, (-r.top / span) * (sections - 1)));
    };
    let p = progress();
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      composer?.setSize(el.clientWidth, el.clientHeight);
      sMat.uniforms.scale.value = el.clientHeight * 0.24;
    };
    window.addEventListener("resize", onResize);

    // render only while the story sections (or anything marked data-world="show") are on screen
    const showing = new Set<Element>();
    let visible = true;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) showing.add(e.target); else showing.delete(e.target); }
      visible = showing.size > 0;
    }, { threshold: 0 });
    const container = document.getElementById(containerId);
    if (container) io.observe(container);
    document.querySelectorAll("[data-world='show']").forEach((n) => io.observe(n));

    const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
    const camPos = new THREE.Vector3(), look = new THREE.Vector3(), scPos = new THREE.Vector3();
    const clock = new THREE.Clock();
    let lastNow = 0;
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const now = clock.getElapsedTime();
      const dt = Math.min(0.5, now - lastNow);
      lastNow = now;
      const t = reduced ? 3 : now;
      // frame-rate independent easing: same feel at 30, 60 or 120 fps
      const ease = (rate: number) => 1 - Math.exp(-dt * rate);
      mouse.x += (mouse.tx - mouse.x) * ease(3);
      mouse.y += (mouse.ty - mouse.y) * ease(3);
      p += (progress() - p) * ease(4.8);

      const i0 = Math.min(KEYS.length - 1, Math.floor(p)), i1 = Math.min(KEYS.length - 1, i0 + 1);
      const f = smooth(0, 1, p - i0);
      const A = KEYS[i0], B = KEYS[i1];
      camPos.copy(v3(A.cam)).lerp(v3(B.cam), f).add(new THREE.Vector3(mouse.x * 0.8, -mouse.y * 0.35, 0));
      camPos.y += terrainH(camPos.x, camPos.z);
      look.copy(v3(A.look)).lerp(v3(B.look), f);
      camera.position.copy(camPos);
      camera.lookAt(look);

      // sculpture morph: shape i0 → i1, scattering a little mid-transition
      scPos.copy(v3(A.sc)).lerp(v3(B.sc), f);
      sculpture.position.copy(scPos).add(new THREE.Vector3(0, Math.sin(t * 0.8) * 0.15, 0));
      const scale = A.scale + (B.scale - A.scale) * f;
      sculpture.scale.setScalar(scale);
      // face the camera and sway, so flat shapes (shield, heart, check) never turn edge-on
      sculpture.lookAt(camera.position);
      sculpture.rotateY(Math.sin(t * 0.45) * 0.42 + mouse.x * 0.35);
      sculpture.rotateX(Math.sin(t * 0.31) * 0.1 - mouse.y * 0.15);
      const a = S[Math.min(i0, S.length - 1)], b = S[Math.min(i1, S.length - 1)];
      const scatter = Math.sin(f * Math.PI) * 1.6;
      for (let i = 0; i < N * 3; i++) {
        sPos[i] = a[i] + (b[i] - a[i]) * f + jitter[i] * (scatter + 0.06 + 0.04 * Math.sin(t * 2 + i));
      }
      (sGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      grassMat.uniforms.time.value = t;
      for (const L of leaves) {
        L.m.position.x += Math.sin(t * L.sx + L.ph) * 0.006 + 0.004;
        L.m.position.y += Math.cos(t * 0.7 + L.ph) * 0.004 - 0.0015;
        if (L.m.position.y < 0.5) L.m.position.y = 13;
        if (L.m.position.x > 22) L.m.position.x = -22;
        L.m.rotation.set(t * L.rot, t * L.rot * 0.7, t * 0.3 + L.ph);
      }
      for (const c of clouds) {
        c.position.x += 0.02;
        if (c.position.x > 280) c.position.x = -280;
      }
      if (composer) composer.render();
      else renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      trash.forEach((d) => d.dispose());
      composer?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme, quality, sections, containerId]);

  // painted backdrop: shows while the scene loads, and stays if the device has no WebGL,
  // so the white headlines are always readable
  const fallback = theme === "night"
    ? "linear-gradient(180deg, #050816 0%, #141c4a 45%, #1e2470 70%, #070a22 100%)"
    : "linear-gradient(180deg, #5f6fd8 0%, #8e8fe6 35%, #3b3fb8 58%, #1c1a5c 80%, #121442 100%)";
  return <div ref={host} className="fixed inset-0 z-0" style={{ background: fallback }} aria-hidden="true" />;
}
