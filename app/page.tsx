"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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

const SCORE_LABELS: { key: keyof Analysis["scores"]; label: string; invertColor?: boolean }[] = [
  { key: "funFactor", label: "Fun Factor" },
  { key: "classicPotential", label: "Classic Potential" },
  { key: "reliabilityRisk", label: "Reliability Risk", invertColor: true },
  { key: "dailyDrivability", label: "Daily Drivability" },
  { key: "modPotential", label: "Mod Potential" },
];

function scoreColor(score: number, invert = false) {
  const val = invert ? 11 - score : score;
  if (val >= 8) return "text-emerald-400";
  if (val >= 5) return "text-amber-400";
  return "text-red-400";
}

function ScoreBar({ score, invert }: { score: number; invert?: boolean }) {
  const color = invert
    ? score >= 8 ? "bg-red-500" : score >= 5 ? "bg-amber-500" : "bg-emerald-500"
    : score >= 8 ? "bg-emerald-500" : score >= 5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score * 10}%` }} />
    </div>
  );
}

export default function Home() {
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
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    arr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [...prev, { file, dataUrl: e.target!.result as string }]);
      };
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
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data as Analysis);
      }
    } catch {
      setError("Network error — make sure the dev server is running.");
    } finally {
      setLoading(false);
    }
  }

  // Handle incoming share target URL (?shared_url=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("shared_url") ?? params.get("url");
    if (sharedUrl) {
      setUrl(sharedUrl);
      setMode("url");
      // Clean the URL bar without triggering a reload
      window.history.replaceState({}, "", "/");
      analyse(sharedUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAnalyse =
    mode === "url" ? url.trim().length > 0
    : mode === "text" ? pastedText.trim().length > 0
    : images.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white">EnthusiastAI</h1>
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-widest">NZ Car Copilot</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Is this car actually worth it?
          </h2>
          <p className="mt-2 text-zinc-400 text-base">
            Paste a listing URL or upload screenshots. Get an honest enthusiast take — not generic advice.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex gap-2 flex-wrap">
            {(["url", "images", "text"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {m === "url" ? "Paste URL" : m === "images" ? "Upload Screenshots" : "Paste Listing Text"}
              </button>
            ))}
          </div>

          {mode === "url" ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canAnalyse && !loading && analyse()}
              placeholder="https://www.trademe.co.nz/a/motors/cars/..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          ) : (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? "border-red-500 bg-red-950/20"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <p className="text-zinc-400 text-sm">
                  Drag & drop screenshots here, or{" "}
                  <span className="text-red-400 font-medium">click to browse</span>
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  Upload multiple images — listing photos, description, price, specs
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
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div>
              <p className="text-xs text-zinc-500 mb-2">
                On the Trade Me listing, press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">Ctrl+A</kbd> then <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">Ctrl+C</kbd> to copy all text, then paste it below.
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full listing text here — title, price, mileage, description, seller notes..."
                rows={8}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>
          )}

          <button
            onClick={analyse}
            disabled={!canAnalyse || loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl py-3 transition-colors text-sm"
          >
            {loading ? "Analysing..." : "Analyse Listing"}
          </button>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-zinc-400 text-sm">Consulting the enthusiast oracle...</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Vehicle header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {result.vehicle.year} {result.vehicle.make} {result.vehicle.model}
                    {result.vehicle.variant && (
                      <span className="text-zinc-400 font-normal"> {result.vehicle.variant}</span>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
                    {result.vehicle.price && <span className="text-white font-semibold">{result.vehicle.price}</span>}
                    {result.vehicle.mileage && <span>{result.vehicle.mileage}</span>}
                    {result.vehicle.transmission && <span>{result.vehicle.transmission}</span>}
                    {result.vehicle.location && <span>{result.vehicle.location}</span>}
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-zinc-100 leading-relaxed">{result.verdict}</p>
              </div>
            </div>

            {/* Scores */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Enthusiast Scores</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SCORE_LABELS.map(({ key, label, invertColor }) => (
                  <div key={key}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-zinc-300">{label}</span>
                      <span className={`text-lg font-bold ${scoreColor(result.scores[key], invertColor)}`}>
                        {result.scores[key]}<span className="text-zinc-600 text-sm font-normal">/10</span>
                      </span>
                    </div>
                    <ScoreBar score={result.scores[key]} invert={invertColor} />
                  </div>
                ))}
              </div>
            </div>

            {/* Common faults */}
            {result.faults.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Known Faults & Watch Points</h4>
                <ul className="space-y-3">
                  {result.faults.map((fault, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">▸</span>
                      <div>
                        <span className="font-medium text-zinc-200">{fault.title}</span>
                        {fault.detail && (
                          <p className="text-zinc-400 text-sm mt-0.5">{fault.detail}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Three column info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {result.priceAnalysis && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Price</h4>
                  <p className="text-zinc-300 text-sm leading-relaxed">{result.priceAnalysis}</p>
                </div>
              )}
              {result.specNotes && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Spec & Rarity</h4>
                  <p className="text-zinc-300 text-sm leading-relaxed">{result.specNotes}</p>
                </div>
              )}
              {result.classicPotential && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Future Classic</h4>
                  <p className="text-zinc-300 text-sm leading-relaxed">{result.classicPotential}</p>
                </div>
              )}
            </div>

            {/* Questions to ask */}
            {result.questionsToAsk.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Questions to Ask the Seller</h4>
                <ol className="space-y-2">
                  {result.questionsToAsk.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-300">
                      <span className="text-zinc-600 font-mono w-5 flex-shrink-0">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Enthusiast take */}
            {result.enthusiastTake && (
              <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">The Enthusiast Take</h4>
                <p className="text-zinc-200 leading-relaxed">{result.enthusiastTake}</p>
              </div>
            )}

            {/* Analyse another */}
            <button
              onClick={() => { setResult(null); setUrl(""); setImages([]); setPastedText(""); }}
              className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-xl py-3 text-sm transition-colors"
            >
              Analyse another listing
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
