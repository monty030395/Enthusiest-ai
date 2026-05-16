"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Fault = { title: string; detail: string };

type Analysis = {
  vehicle: {
    make: string;
    model: string;
    year: string;
    variant: string;
    mileage: string;
    price: string;
    transmission: string;
    location: string;
  };
  verdict: string;
  faults: Fault[];
  priceAnalysis: string;
  specNotes: string;
  classicPotential: string;
  questionsToAsk: string[];
  scores: {
    funFactor: number;
    classicPotential: number;
    reliabilityRisk: number;
    dailyDrivability: number;
    modPotential: number;
  };
  enthusiastTake: string;
};

const SCORES: {
  key: keyof Analysis["scores"];
  label: string;
  invert?: boolean;
}[] = [
  { key: "funFactor", label: "Fun" },
  { key: "classicPotential", label: "Classic" },
  { key: "reliabilityRisk", label: "Risk", invert: true },
  { key: "dailyDrivability", label: "Daily" },
  { key: "modPotential", label: "Mods" },
];

function scoreTileColor(score: number, invert = false) {
  const v = invert ? 11 - score : score;
  if (v >= 8) return "bg-emerald-950 text-emerald-400 border-emerald-800";
  if (v >= 5) return "bg-amber-950 text-amber-400 border-amber-800";
  return "bg-red-950 text-red-400 border-red-900";
}

function ScoreTile({ score, label, invert }: { score: number; label: string; invert?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center border rounded-xl py-4 px-2 ${scoreTileColor(score, invert)}`}>
      <span className="text-3xl font-black tabular-nums leading-none">{score}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-1.5 opacity-70">{label}</span>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-xs font-medium">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
      {children}
    </p>
  );
}

function HomeContent() {
  const [mode, setMode] = useState<"url" | "images" | "text">("url");
  const [url, setUrl] = useState("");
  const [images, setImages] = useState<{ file: File; dataUrl: string }[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addImages = useCallback((files: FileList | File[]) => {
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) =>
          setImages((prev) => [...prev, { file, dataUrl: e.target!.result as string }]);
        reader.readAsDataURL(file);
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

  async function analyse(sharedUrl?: string) {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const body = sharedUrl
        ? { url: sharedUrl }
        : mode === "url"
        ? { url }
        : mode === "text"
        ? { pastedText }
        : { images: images.map((i) => i.dataUrl) };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "BLOCKED") {
          setMode("images");
          setError(data.message);
        } else {
          setError(data.error || "Something went wrong.");
        }
      } else {
        setResult(data as Analysis);
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const searchParams = useSearchParams();
  useEffect(() => {
    const directUrl = searchParams.get("shared_url") ?? searchParams.get("url");
    const textParam = searchParams.get("text") ?? "";
    const urlInText = textParam.match(/https?:\/\/[^\s]+/)?.[0];
    const sharedUrl = directUrl ?? urlInText;
    if (sharedUrl) {
      setUrl(sharedUrl);
      setMode("url");
      window.history.replaceState({}, "", "/");
      analyse(sharedUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const canAnalyse =
    mode === "url" ? url.trim().length > 0
    : mode === "text" ? pastedText.trim().length > 0
    : images.length > 0;

  const modeLabels = { url: "Paste URL", images: "Screenshots", text: "Paste Text" };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans">

      {/* Header */}
      <header className="px-6 pt-5 pb-4 border-b border-zinc-800/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-lg font-black tracking-tight text-white uppercase">Enthusiast</span>
              <span className="text-lg font-black tracking-tight text-red-500 uppercase">AI</span>
            </div>
            <div className="h-4 w-px bg-zinc-700" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">NZ Car Copilot</span>
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">

        {/* Hero */}
        <div className="pt-2">
          <h2 className="text-4xl font-black text-white leading-[1.1] tracking-tight">
            Is this car<br />
            <span className="text-red-500">worth your money?</span>
          </h2>
          <p className="mt-3 text-zinc-500 text-sm leading-relaxed max-w-md">
            Share a listing from Trade Me or upload screenshots. Get a specific, honest enthusiast read — not the generic rubbish you already know.
          </p>
        </div>

        {/* Input card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">

          {/* Mode tabs */}
          <div className="flex border-b border-zinc-800">
            {(["url", "images", "text"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                  mode === m
                    ? "text-white border-b-2 border-red-500 bg-zinc-800/40"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {mode === "url" && (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAnalyse && !loading && analyse()}
                placeholder="https://www.trademe.co.nz/a/motors/cars/..."
                className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/70 focus:bg-zinc-800 transition-all"
              />
            )}

            {mode === "images" && (
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragging
                      ? "border-red-500 bg-red-950/20"
                      : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30"
                  }`}
                >
                  <p className="text-sm text-zinc-300 font-medium">
                    Drop screenshots here or <span className="text-red-400">tap to browse</span>
                  </p>
                  <p className="text-xs text-zinc-600 mt-1.5">
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
                          className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
                        />
                        <button
                          onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
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
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  On the listing page, select all (<kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Ctrl+A</kbd>) and copy (<kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Ctrl+C</kbd>), then paste below.
                </p>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the full listing text here..."
                  rows={7}
                  className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/70 transition-all resize-none"
                />
              </div>
            )}

            {error && (
              <div className="flex gap-3 bg-amber-950/30 border border-amber-900/60 rounded-xl px-4 py-3">
                <span className="text-amber-500 flex-shrink-0 font-bold">!</span>
                <p className="text-amber-200/80 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={() => analyse()}
              disabled={!canAnalyse || loading}
              className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest rounded-xl py-3.5 transition-all text-xs"
            >
              {loading ? "Getting Under the Hood..." : "Analyse Listing"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
              <div className="absolute inset-0 rounded-full border-2 border-t-red-500 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-sm">Consulting the oracle</p>
              <p className="text-zinc-500 text-xs mt-1">Reading the listing, checking the numbers...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">

            {/* Vehicle header */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              {/* Red accent bar */}
              <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-transparent" />
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">
                      {result.vehicle.year} {result.vehicle.location && `· ${result.vehicle.location}`}
                    </p>
                    <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
                      {result.vehicle.make} {result.vehicle.model}
                    </h3>
                    {result.vehicle.variant && (
                      <p className="text-zinc-400 font-medium mt-0.5">{result.vehicle.variant}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {result.vehicle.mileage && <Pill>{result.vehicle.mileage}</Pill>}
                      {result.vehicle.transmission && <Pill>{result.vehicle.transmission}</Pill>}
                    </div>
                  </div>
                  {result.vehicle.price && (
                    <div className="bg-red-600 rounded-xl px-4 py-2 text-right flex-shrink-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-red-200 opacity-80">Asking</p>
                      <p className="text-xl font-black text-white">{result.vehicle.price}</p>
                    </div>
                  )}
                </div>

                {/* Verdict */}
                <div className="mt-5 pl-4 border-l-2 border-red-600">
                  <p className="text-zinc-200 leading-relaxed text-sm italic">{result.verdict}</p>
                </div>
              </div>
            </div>

            {/* Score tiles */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <SectionLabel>Enthusiast Scores</SectionLabel>
              <div className="grid grid-cols-5 gap-2">
                {SCORES.map(({ key, label, invert }) => (
                  <ScoreTile
                    key={key}
                    score={result.scores[key]}
                    label={label}
                    invert={invert}
                  />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 mt-1.5">
                {SCORES.map(({ key, label }) => (
                  <p key={key} className="text-center text-[9px] text-zinc-600 hidden sm:block">{label}</p>
                ))}
              </div>
            </div>

            {/* Known faults */}
            {result.faults.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <SectionLabel>Known Faults & Watch Points</SectionLabel>
                <ul className="space-y-3">
                  {result.faults.map((fault, i) => (
                    <li key={i} className="flex gap-3 pl-3 border-l border-red-800">
                      <div>
                        <p className="font-bold text-zinc-200 text-sm">{fault.title}</p>
                        {fault.detail && (
                          <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{fault.detail}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Price / Spec / Classic */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Price Check", content: result.priceAnalysis },
                { label: "Spec & Rarity", content: result.specNotes },
                { label: "Future Classic", content: result.classicPotential },
              ].filter((s) => s.content).map((section) => (
                <div key={section.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <SectionLabel>{section.label}</SectionLabel>
                  <p className="text-zinc-300 text-xs leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>

            {/* Questions */}
            {result.questionsToAsk.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <SectionLabel>Ask the Seller</SectionLabel>
                <ol className="space-y-2.5">
                  {result.questionsToAsk.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-red-600 font-black w-4 flex-shrink-0 tabular-nums">{i + 1}</span>
                      <span className="text-zinc-300 leading-snug">{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Enthusiast take */}
            {result.enthusiastTake && (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-700 overflow-hidden">
                <div className="bg-red-600 px-5 py-2.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    The Enthusiast Take
                  </span>
                </div>
                <div className="px-5 py-4">
                  <p className="text-zinc-100 leading-relaxed text-sm">{result.enthusiastTake}</p>
                </div>
              </div>
            )}

            {/* Reset */}
            <button
              onClick={() => { setResult(null); setUrl(""); setImages([]); setPastedText(""); }}
              className="w-full border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 rounded-xl py-3 text-xs font-bold uppercase tracking-widest transition-all"
            >
              Analyse Another Listing
            </button>

          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
