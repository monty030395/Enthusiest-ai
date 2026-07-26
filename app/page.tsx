"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { type Analysis } from "./_lib/analysis";
import { compressImage } from "./_lib/images";
import { saveCheck } from "./_lib/garage";
import { V_RED } from "./_components/badges";
import { Card, RotatingMessage, WheelSpinner } from "./_components/ui";
import Masthead from "./_components/Masthead";
import AnalysisResults from "./_components/AnalysisResults";

export default function Home() {
  const [mode, setMode] = useState<"text" | "images">("text");
  const [images, setImages] = useState<{ file: File; dataUrl: string }[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [urlHint, setUrlHint] = useState("");
  const [urlHintVisible, setUrlHintVisible] = useState(false);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => clearTimeout(timer);
  }, [result]);

  function handleReset() {
    setResult(null);
    setInputCollapsed(false);
    setImages([]);
    setPastedText("");
    setError("");
    setUrlHint("");
    setUrlHintVisible(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const addImages = useCallback((files: FileList | File[]) => {
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .forEach((file) => {
        compressImage(file).then((dataUrl) =>
          setImages((prev) => [...prev, { file, dataUrl }])
        );
      });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addImages(e.dataTransfer.files);
    },
    [addImages]
  );

  async function analyse(textOverride?: string) {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const body = mode === "text"
        ? { pastedText: textOverride ?? pastedText }
        : { images: images.map((i) => i.dataUrl) };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 413) {
        setError("Those screenshots are too big to send in one go — remove a couple, or crop them to the parts of the listing that matter.");
        return;
      }
      // Vercel/proxy errors aren't always JSON — don't let the parse throw
      // masquerade as a network failure
      let data: { error?: string } | Analysis | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok || !data) {
        setError((data as { error?: string } | null)?.error || `The server choked on that one (HTTP ${res.status}) — give it another go.`);
      } else {
        setResult(data as Analysis);
        setInputCollapsed(true);
        saveCheck(data as Analysis);
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const content = e.clipboardData.getData("text");
    if (content.includes("trademe.co.nz")) {
      e.preventDefault();
      setPastedText("");
      setUrlHint("Open that listing in Trade Me, copy the full description text and paste it here — we'll handle the rest.");
      setUrlHintVisible(false);
      setTimeout(() => setUrlHintVisible(true), 10);
    } else if (content.length > 50 && !content.startsWith("http")) {
      setUrlHint("");
      setUrlHintVisible(false);
      setTimeout(() => analyse(content), 100);
    } else {
      setUrlHint("");
      setUrlHintVisible(false);
    }
  }

  const canAnalyse = mode === "text" ? pastedText.trim().length > 0 : images.length > 0;

  const modeLabels: Record<"text" | "images", string> = { text: "Paste Text", images: "Screenshots" };

  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">

      <Masthead active="analyse" />

      <main className="max-w-3xl mx-auto px-5 py-10 space-y-6">

        {/* Collapsible: Hero + Input */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${inputCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[900px] opacity-100"}`}>
          <div className="space-y-8">

        {/* Hero */}
        <div className="pt-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ember-400 mb-4">
            Pre-purchase intelligence
          </p>
          <h2 className="font-display text-[2.6rem] sm:text-5xl font-extrabold text-ink leading-[1.05] tracking-tight">
            Is this car<br />
            <span className="text-ember-400">worth your money?</span>
          </h2>
          <p className="mt-4 text-ink-muted text-sm leading-relaxed max-w-md">
            Paste a listing from Trade Me or upload screenshots. Get a specific, honest enthusiast read — not the generic rubbish you already know.
          </p>
        </div>

        {/* Input card */}
        <div className="rounded-xl border border-line bg-white/[0.02] overflow-hidden">
          <div className="flex border-b border-line">
            {(["text", "images"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
                  mode === m
                    ? "text-ink border-b-2 border-ember-400 bg-white/[0.03]"
                    : "text-ink-faint hover:text-ink-muted"
                }`}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {mode === "images" && (
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    dragging
                      ? "border-ember-400 bg-ember-500/10"
                      : "border-line-strong hover:border-ember-500/50 hover:bg-white/[0.03]"
                  }`}
                >
                  <p className="text-sm text-ink-muted font-medium">
                    Drop screenshots here or <span className="text-ember-400">tap to browse</span>
                  </p>
                  <p className="font-mono text-[11px] text-ink-faint mt-2">
                    Screenshot the listing — price, KMs, description, seller notes
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && addImages(e.target.files)}
                />
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.dataUrl}
                          alt={`Screenshot ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-line-strong"
                        />
                        <button
                          aria-label={`Remove screenshot ${i + 1}`}
                          onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-ember-500 rounded-full text-carbon-950 text-sm font-bold flex items-center justify-center leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === "text" && (
              <div className="space-y-2.5">
                <p className="font-mono text-[11px] text-ink-faint leading-relaxed">
                  Copy the listing description from Trade Me and paste it here — the more detail the better.
                </p>
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    if (urlHint) { setUrlHint(""); setUrlHintVisible(false); }
                  }}
                  onPaste={handlePaste}
                  placeholder="Paste the full listing text here..."
                  rows={7}
                  className="w-full bg-carbon-900/80 border border-line rounded-lg px-4 py-3.5 text-base sm:text-sm text-ink placeholder:text-ink-faint placeholder:font-mono focus:outline-none focus:border-ember-500/60 transition-all resize-none"
                />
                {urlHint && (
                  <div
                    className="flex gap-2.5 bg-ember-500/10 border border-ember-600/40 rounded-lg px-4 py-3 transition-opacity duration-300"
                    style={{ opacity: urlHintVisible ? 1 : 0 }}
                  >
                    <span className="text-ember-400 flex-shrink-0 font-bold">→</span>
                    <p className="text-ember-300/90 text-sm leading-relaxed">{urlHint}</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: V_RED.bg, border: `1px solid ${V_RED.border}` }}>
                <span className="flex-shrink-0 font-bold" style={{ color: V_RED.text }}>!</span>
                <p className="text-sm leading-relaxed" style={{ color: V_RED.text }}>{error}</p>
              </div>
            )}

            <button
              onClick={() => analyse()}
              disabled={!canAnalyse || loading}
              className="w-full bg-ember-500 hover:bg-ember-400 active:bg-ember-600 disabled:bg-carbon-800 disabled:text-ink-faint disabled:cursor-not-allowed text-carbon-950 font-mono font-bold uppercase tracking-[0.22em] rounded-lg py-4 transition-all text-xs"
            >
              {loading ? "Getting Under the Hood..." : "Analyse Listing"}
            </button>
          </div>
        </div>

          </div>{/* end space-y-8 */}
        </div>{/* end collapsible */}

        {/* New Analysis button — visible at top when input is collapsed */}
        {inputCollapsed && (
          <button
            onClick={handleReset}
            className="w-full border border-line hover:border-line-strong text-ink-faint hover:text-ink-muted rounded-lg py-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <span className="text-ember-400 text-sm leading-none">+</span> New Analysis
          </button>
        )}

        {/* Results anchor */}
        <div ref={resultsRef} />

        {/* Loading */}
        {loading && (
          <Card className="p-12 flex flex-col items-center gap-6">
            <WheelSpinner />
            <div className="text-center">
              <p className="font-display text-ink font-bold text-sm uppercase tracking-[0.12em]">Getting Under the Hood</p>
              <RotatingMessage />
            </div>
          </Card>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            <AnalysisResults analysis={result} />

            <p className="font-mono text-[10px] text-ink-faint text-center">
              Saved to your <Link href="/garage" className="text-ember-400 hover:text-ember-300 transition-colors">Garage</Link> — on this device only.
            </p>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full border border-line hover:border-line-strong text-ink-faint hover:text-ink-muted rounded-lg py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] transition-all"
            >
              Analyse Another Listing
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
