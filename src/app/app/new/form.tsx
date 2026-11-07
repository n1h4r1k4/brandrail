"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { Button, Card, Tag } from "@/components/ui";
import { createContent, extractDocumentText } from "../actions";
import { analyseImage } from "@/lib/client/image-analysis";
import type { ImageAnalysis } from "@/lib/db/schema";
import type { Sample } from "@/lib/seed/nimbus";

const CHANNELS = ["Instagram", "Facebook", "X / Twitter", "LinkedIn", "Email", "Website", "Blog", "Display ad", "Push", "SMS", "Sales deck", "Other"];

export function NewContentForm({ samples, ai }: { samples: Sample[]; ai: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("Instagram");
  const [audience, setAudience] = useState("");
  const [source, setSource] = useState<"human" | "agency" | "ai">("human");
  const [body, setBody] = useState("");
  const [altText, setAltText] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; text: string; analysis: ImageAnalysis } | null>(null);
  const [imageText, setImageText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const docRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function addImage(src: string) {
    setError(null);
    try {
      const res = await analyseImage(src, setBusy);
      setImage(res);
      setImageText(res.text);
    } catch {
      setError("Couldn't read that image. Try a PNG or JPG.");
    } finally {
      setBusy(null);
    }
  }

  async function loadSample(s: Sample) {
    setTitle(s.title);
    setChannel(s.channel);
    setAudience(s.audience);
    setSource(s.source);
    setBody(s.body);
    setAltText(s.altText ?? "");
    setImage(null);
    setImageText("");
    if (s.image) await addImage(s.image);
  }

  async function onDoc(file: File) {
    setBusy("Extracting text…");
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await extractDocumentText(fd);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setBody(res.pages.join("\n\n"));
    if (!title) setTitle(res.name.replace(/\.[^.]+$/, ""));
  }

  function submit() {
    setError(null);
    start(async () => {
      setBusy(ai ? "Running rule-based checks, then the grounded AI review… (about 10–30 s)" : "Running rule-based checks…");
      const res = await createContent({
        title, channel, audience, source, body, altText,
        imageData: image?.dataUrl ?? null, imageText, imageAnalysis: image?.analysis ?? null,
      });
      if (!res.ok) {
        setBusy(null);
        setError(res.error);
        return;
      }
      router.push(`/app/content/${res.id}`);
    });
  }

  const working = pending || busy !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali cashback post" />
          </Field>
          <Field label="Channel">
            <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Audience">
            <input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. First-time savers" />
          </Field>
          <Field label="Written by">
            <div className="flex gap-1.5">
              {([["human", "Employee"], ["agency", "Agency"], ["ai", "AI tool"]] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setSource(v)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-sm ${source === v ? "border-accent bg-accent-soft font-medium text-accent" : "border-line text-ink-2 hover:bg-soft"}`}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Text" className="mt-4">
          <textarea className="input min-h-44 font-[450] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste the caption, email, blog post or ad copy…" />
        </Field>
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={docRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => e.target.files?.[0] && onDoc(e.target.files[0])} />
          <Button variant="secondary" size="sm" type="button" onClick={() => docRef.current?.click()} disabled={working}><FileUp size={14} /> Upload DOCX / PDF</Button>
          <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(URL.createObjectURL(f)); }} />
          <Button variant="secondary" size="sm" type="button" onClick={() => imgRef.current?.click()} disabled={working}><ImagePlus size={14} /> Add image</Button>
        </div>

        {image && (
          <div className="mt-4 grid gap-4 rounded-xl border border-line bg-soft/60 p-4 sm:grid-cols-[180px_1fr]">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.dataUrl} alt="Uploaded creative preview" className="w-full rounded-lg border border-line" />
              <button type="button" onClick={() => { setImage(null); setImageText(""); }} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-muted hover:text-ink" aria-label="Remove image"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <Field label={`Text found in the image (OCR, ${image.analysis.ocrConfidence}% confidence). Correct it if needed.`}>
                <textarea className="input min-h-20 text-sm" value={imageText} onChange={(e) => setImageText(e.target.value)} />
              </Field>
              <Field label="Alt text">
                <input className="input" value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image for screen readers" />
              </Field>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                Colours:
                {image.analysis.palette.slice(0, 6).map((p) => (
                  <span key={p.hex} className="inline-flex items-center gap-1 rounded border border-line bg-white px-1.5 py-0.5 font-mono">
                    <span className="h-3 w-3 rounded-sm border border-black/10" style={{ background: p.hex }} />{Math.round(p.share * 100)}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-blocker-soft px-3 py-2 text-sm text-blocker">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={working || !title.trim() || (!body.trim() && !image)}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Check content
          </Button>
          {busy && <span className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> {busy}</span>}
        </div>
        {!ai && <p className="mt-3 text-xs text-major">AI review is off on this deployment (no AI key configured). Rule-based checks still run.</p>}
      </Card>

      <aside className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Try a sample</h2>
        {samples.map((s) => (
          <button key={s.key} type="button" disabled={working} onClick={() => loadSample(s)}
            className="block w-full rounded-2xl border border-line/80 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift disabled:opacity-50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{s.title}</span>
              {s.image && <Tag tone="accent">image</Tag>}
            </div>
            <div className="mt-0.5 text-xs text-muted">{s.channel} · {s.source === "ai" ? "AI-assisted" : s.source === "agency" ? "Agency" : "Employee"}</div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{s.blurb}</p>
          </button>
        ))}
      </aside>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
