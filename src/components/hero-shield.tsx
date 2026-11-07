"use client";
// Animated 3D shield for the dashboard banner: a glossy glass shield with the Brandrail check,
// an orbit ring and drifting indigo/teal particles. It tilts toward the mouse, pauses when
// off screen, and leaves the static illustration underneath if WebGL isn't available.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export function HeroShield3D({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    el.dataset.ready = "1";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.1, 50);
    camera.position.set(0, 0, 10);
    scene.add(new THREE.HemisphereLight("#e0e7ff", "#134e4a", 1.0));
    const key = new THREE.DirectionalLight("#ffffff", 1.6);
    key.position.set(3, 5, 6);
    scene.add(key);

    const trash: { dispose: () => void }[] = [env, pmrem, room];
    const keep = <T extends { dispose: () => void }>(x: T) => (trash.push(x), x);

    // shield body
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.55);
    shape.bezierCurveTo(0.55, 1.35, 1.0, 1.25, 1.3, 1.2);
    shape.lineTo(1.3, 0.1);
    shape.bezierCurveTo(1.3, -0.85, 0.6, -1.4, 0, -1.7);
    shape.bezierCurveTo(-0.6, -1.4, -1.3, -0.85, -1.3, 0.1);
    shape.lineTo(-1.3, 1.2);
    shape.bezierCurveTo(-1.0, 1.25, -0.55, 1.35, 0, 1.55);
    const bodyGeo = keep(new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 6, curveSegments: 32 }));
    bodyGeo.center();
    const bodyMat = keep(new THREE.MeshPhysicalMaterial({
      color: "#c7d2fe", roughness: 0.12, metalness: 0.1, transmission: 0.35, thickness: 0.8, clearcoat: 1, clearcoatRoughness: 0.05,
      iridescence: 0.6, iridescenceIOR: 1.3, sheen: 0.4, sheenColor: new THREE.Color("#5eead4"),
    }));
    const body = new THREE.Mesh(bodyGeo, bodyMat);

    // check mark on both faces
    const check = new THREE.Shape();
    check.moveTo(-0.66, 0.02); check.lineTo(-0.2, -0.46); check.lineTo(0.72, 0.5); check.lineTo(0.5, 0.72);
    check.lineTo(-0.2, -0.04); check.lineTo(-0.44, 0.24); check.closePath();
    const checkGeo = keep(new THREE.ExtrudeGeometry(check, { depth: 0.12, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }));
    const checkMat = keep(new THREE.MeshStandardMaterial({ color: "#4338ca", emissive: "#3730a3", emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.3 }));
    const front = new THREE.Mesh(checkGeo, checkMat);
    front.position.set(0, -0.05, 0.3);
    const back = new THREE.Mesh(checkGeo, checkMat);
    back.rotation.y = Math.PI;
    back.position.set(0, -0.05, -0.3);

    const shield = new THREE.Group();
    shield.add(body, front, back);
    scene.add(shield);

    // orbit ring and particles
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(2.35, 0.012, 8, 160)), keep(new THREE.MeshBasicMaterial({ color: "#5eead4", transparent: true, opacity: 0.7 })));
    ring.rotation.x = 1.15;
    scene.add(ring);
    const n = 260, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seeds = new Float32Array(n);
    const pal = [new THREE.Color("#a5b4fc"), new THREE.Color("#5eead4"), new THREE.Color("#ffffff"), new THREE.Color("#818cf8")];
    for (let i = 0; i < n; i++) {
      seeds[i] = Math.random();
      const c = pal[i % pal.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const pGeo = keep(new THREE.BufferGeometry());
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const dots = new THREE.Points(pGeo, keep(new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })));
    scene.add(dots);

    // interaction and loop
    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove);
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);
    const clock = new THREE.Clock();
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = reduced ? 1.5 : clock.getElapsedTime();
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      shield.rotation.y = Math.sin(t * 0.6) * 0.45 + mx * 0.8;
      shield.rotation.x = Math.sin(t * 0.45) * 0.08 + my * 0.4;
      shield.position.y = Math.sin(t * 1.1) * 0.08;
      ring.rotation.z = t * 0.25;
      for (let i = 0; i < n; i++) {
        const s = seeds[i], a = t * (0.15 + s * 0.35) + s * 40, r = 2.0 + s * 1.1;
        pos.set([Math.cos(a) * r, Math.sin(a * 1.3 + s * 9) * 0.9 * (0.4 + s), Math.sin(a) * r * 0.5], i * 3);
      }
      pGeo.attributes.position.needsUpdate = true;
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
  }, []);

  return <div ref={host} className={className} aria-hidden="true" />;
}
