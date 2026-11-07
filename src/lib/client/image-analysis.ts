"use client";
// Runs in the browser: OCR (tesseract.js), per-line text contrast and the dominant
// colour palette. The image never needs to leave the browser for these checks.
import type { ImageAnalysis } from "@/lib/db/schema";
import { contrastRatio, luminance, rgbToHex, type RGB } from "@/lib/color";

export interface AnalysedImage {
  dataUrl: string;
  text: string;
  analysis: ImageAnalysis;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  return img;
}

function kmeans(pixels: RGB[], k: number, iters = 10) {
  if (pixels.length === 0) return [];
  const sorted = [...pixels].sort((a, b) => luminance(a) - luminance(b));
  let centers: RGB[] = Array.from({ length: k }, (_, i) => sorted[Math.floor(((i + 0.5) / k) * (sorted.length - 1))]);
  let assign = new Array(pixels.length).fill(0);
  for (let it = 0; it < iters; it++) {
    assign = pixels.map((p) => {
      let best = 0, bd = Infinity;
      centers.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bd) { bd = d; best = j; }
      });
      return best;
    });
    centers = centers.map((c, j) => {
      const members = pixels.filter((_, i) => assign[i] === j);
      if (!members.length) return c;
      return [0, 1, 2].map((ch) => members.reduce((s, m) => s + m[ch], 0) / members.length) as RGB;
    });
  }
  return centers.map((c, j) => ({ color: c, count: assign.filter((a) => a === j).length }));
}

function pixelsIn(data: ImageData, x0: number, y0: number, x1: number, y1: number, maxSamples = 4000): RGB[] {
  const out: RGB[] = [];
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / maxSamples)));
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * data.width + x) * 4;
      if (data.data[i + 3] < 128) continue;
      out.push([data.data[i], data.data[i + 1], data.data[i + 2]]);
    }
  }
  return out;
}

/**
 * Saturation map for a second OCR pass. Low-contrast text in brand creatives is usually white or
 * grey text on a saturated colour (e.g. white on yellow): close in brightness, far apart in
 * saturation. In this map the text becomes dark on a light background, which OCR reads easily.
 */
function enhanceForOcr(data: ImageData): HTMLCanvasElement {
  const { width: w, height: h } = data;
  const out = new ImageData(w, h);
  for (let i = 0; i < w * h * 4; i += 4) {
    const r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
    const v = Math.min(255, (Math.max(r, g, b) - Math.min(r, g, b)) * 1.6);
    out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

const cleanLine = (t: string) =>
  t.replace(/\s+/g, " ").trim().replace(/^[^A-Za-z0-9₹#%"'(]+/, "").replace(/[^A-Za-z0-9%.!?)"'₹]+$/, "").trim();

type Bbox = { x0: number; y0: number; x1: number; y1: number };
const iou = (a: Bbox, b: Bbox) => {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = ix * iy;
  const area = (r: Bbox) => (r.x1 - r.x0) * (r.y1 - r.y0);
  return inter / Math.max(1, area(a) + area(b) - inter);
};

function borderPixels(data: ImageData, x0: number, y0: number, x1: number, y1: number, pad: number): RGB[] {
  const out: RGB[] = [];
  const X0 = Math.max(0, x0 - pad), Y0 = Math.max(0, y0 - pad);
  const X1 = Math.min(data.width - 1, x1 + pad), Y1 = Math.min(data.height - 1, y1 + pad);
  const push = (x: number, y: number) => {
    const i = (y * data.width + x) * 4;
    out.push([data.data[i], data.data[i + 1], data.data[i + 2]]);
  };
  for (let x = X0; x <= X1; x += 2) { push(x, Y0); push(x, Y1); }
  for (let y = Y0; y <= Y1; y += 2) { push(X0, y); push(X1, y); }
  return out;
}

export async function analyseImage(src: string, onProgress?: (msg: string) => void): Promise<AnalysedImage> {
  onProgress?.("Preparing image…");
  const img = await loadImage(src);
  const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

  onProgress?.("Reading text in the image (OCR)…");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  const pass1 = await worker.recognize(canvas, {}, { blocks: true });
  onProgress?.("Second OCR pass for low-contrast text…");
  const pass2 = await worker.recognize(enhanceForOcr(data), {}, { blocks: true });
  await worker.terminate();

  onProgress?.("Measuring contrast and colours…");
  const found: { text: string; bbox: Bbox; confidence: number }[] = [];
  for (const [pass, minConf] of [[pass1, 45], [pass2, 55]] as const) {
    for (const block of pass.data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          const text = cleanLine(line.text);
          if (line.confidence < minConf || text.replace(/[^A-Za-z0-9]/g, "").length < 2) continue;
          if (found.some((f) => iou(f.bbox, line.bbox) > 0.3)) continue;
          found.push({ text, bbox: line.bbox, confidence: line.confidence });
        }
      }
    }
  }
  found.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  const lines: ImageAnalysis["lines"] = [];
  let confSum = 0;
  for (const f of found) {
    confSum += f.confidence;
    const { x0, y0, x1, y1 } = f.bbox;
    const clusters = kmeans(pixelsIn(data, x0, y0, x1, y1, 3000), 2, 8);
    if (clusters.length < 2) continue;
    // The background is whichever colour dominates a thin ring just outside the text box.
    const ring = borderPixels(data, x0, y0, x1, y1, 4);
    const near = (p: RGB) => {
      const d = clusters.map((c) => (p[0] - c.color[0]) ** 2 + (p[1] - c.color[1]) ** 2 + (p[2] - c.color[2]) ** 2);
      return d[0] <= d[1] ? 0 : 1;
    };
    const votes = [0, 0];
    for (const p of ring) votes[near(p)]++;
    const bgIdx = ring.length ? (votes[0] >= votes[1] ? 0 : 1) : (clusters[0].count >= clusters[1].count ? 0 : 1);
    const bg = clusters[bgIdx], fg = clusters[1 - bgIdx];
    lines.push({
      text: f.text,
      contrast: Math.round(contrastRatio(fg.color, bg.color) * 100) / 100,
      fg: rgbToHex(fg.color),
      bg: rgbToHex(bg.color),
      large: (y1 - y0) / canvas.height >= 0.05,
    });
  }
  const confN = found.length;
  const all = pixelsIn(data, 0, 0, canvas.width, canvas.height, 6000);
  const palette = kmeans(all, 6, 10)
    .filter((c) => c.count > 0)
    .map((c) => ({ hex: rgbToHex(c.color), share: Math.round((c.count / all.length) * 1000) / 1000 }))
    .sort((a, b) => b.share - a.share);

  return {
    dataUrl,
    text: lines.map((l) => l.text).join("\n"),
    analysis: {
      width: canvas.width,
      height: canvas.height,
      ocrConfidence: confN ? Math.round(confSum / confN) : 0,
      lines,
      palette,
    },
  };
}
