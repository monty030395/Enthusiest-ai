"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type DriveMetric = { score: number; description: string };

type Analysis = {
  vehicle: {
    make: string;
    model: string;
    year: string;
    variant: string;
    mileage: string;
    price: string;
    transmission: string;
    colour: string;
    importStatus: string;
    location: string;
  };
  label: string;
  verdict: string;
  whatMakesSpecial: string;
  whyEnthusiastsCare: string;
  ownerVibe: { label: string; reasoning: string };
  specSignificance: { item: string; note: string }[];
  priceVerdict: { assessment: string; reason: string };
  enthusiastTax: { level: string; reasons: string[] };
  ownershipPain: { score: number; issues: { title: string; detail: string }[] };
  drivingCharacter: {
    steeringFeel: DriveMetric;
    engineCharacter: DriveMetric;
    dailyComfort: DriveMetric;
    overallFun: DriveMetric;
    summary: string;
  };
  classicPotential: { score: number; reasons: string[] };
  worstFinancialDecision: { rating: string; reasons: string[] };
  redFlags: { flag: string; explanation: string }[];
  priceOutlook?: { trend: string; reason: string };
  carsCoffee?: { rating: string; description: string };
  communityCredibility?: { rating: string; description: string };
  socialStanding?: string;
  regretRisk?: { level: string; reason: string };
  marketTrend?: { trend: string; reason: string };
  questionsToAsk: string[];
  enthusiastTake: string;
  performanceSpecs?: {
    engine: string;
    powerKw: number;
    powerHp: number;
    torqueNm: number;
    torqueRpm: string;
    zeroToHundred: string;
    kerbWeightKg: number;
    drivetrain: string;
    jdmNote: string;
  };
  modPotential?: {
    relevance: string;
    powerCeiling: string;
    firstMods: string[];
    handlingUpgrades: string;
    partsEcosystem: string;
    collectorRisk: string;
  };
};

const LABEL_STYLES: Record<string, string> = {
  "Hidden Gem":            "bg-emerald-600 text-white",
  "Future Classic":        "bg-amber-500 text-black",
  "Premium Asking Price":  "bg-orange-600 text-white",
  "Cheap Thrill":          "bg-sky-600 text-white",
  "Money Pit":             "bg-red-700 text-white",
  "Peak Daily Driver":     "bg-zinc-600 text-white",
  "Overrated":             "bg-rose-700 text-white",
  "Underrated":            "bg-teal-600 text-white",
};

const PRICE_ASSESSMENT_STYLES: Record<string, string> = {
  "Fair":                "text-emerald-400",
  "Underpriced":         "text-emerald-400",
  "Premium Justified":   "text-amber-400",
  "Overpriced":          "text-red-400",
  "Paying the Premium":  "text-orange-400",
};

const OWNER_VIBE_STYLES: Record<string, string> = {
  "Mature Enthusiast Owner":     "bg-blue-900 text-blue-200",
  "Deferred Maintenance Energy": "bg-amber-900 text-amber-200",
  "Drift Missile History":       "bg-orange-900 text-orange-200",
  "Rich Dentist Spec":           "bg-purple-900 text-purple-200",
  "Grandpa-Owned Gem":           "bg-emerald-900 text-emerald-200",
  "TikTok Build":                "bg-pink-900 text-pink-200",
  "Weekend Warrior":             "bg-sky-900 text-sky-200",
  "Motivated Seller":            "bg-teal-900 text-teal-200",
  "Optimistic Dreamer":          "bg-rose-900 text-rose-200",
  "Dealer Dressed as Private":   "bg-zinc-700 text-zinc-300",
};

const TAX_LEVEL_STYLES: Record<string, { badge: string; icon: string }> = {
  "None":     { badge: "bg-zinc-700 text-zinc-300",         icon: "text-zinc-500" },
  "Mild":     { badge: "bg-emerald-900 text-emerald-200",   icon: "text-emerald-500" },
  "Moderate": { badge: "bg-amber-900 text-amber-200",       icon: "text-amber-500" },
  "High":     { badge: "bg-orange-900 text-orange-200",     icon: "text-orange-500" },
  "Extreme":  { badge: "bg-red-900 text-red-200",           icon: "text-red-500" },
};

const RATING_BADGE_STYLES: Record<string, string> = {
  "High":    "bg-red-900/60 text-red-300 border border-red-800/50",
  "Medium":  "bg-amber-900/60 text-amber-300 border border-amber-800/50",
  "Low":     "bg-emerald-900/60 text-emerald-300 border border-emerald-800/50",
  "Extreme": "bg-red-900/80 text-red-200 border border-red-700/50",
};

const TREND_BADGE_STYLES: Record<string, string> = {
  "Stable":   "bg-zinc-800 text-zinc-300 border border-zinc-700",
  "Rising":   "bg-emerald-900/60 text-emerald-300 border border-emerald-800/50",
  "Falling":  "bg-red-900/60 text-red-300 border border-red-800/50",
  "Declining":"bg-red-900/60 text-red-300 border border-red-800/50",
};

const FINANCIAL_RATING_STYLES: Record<string, { color: string; bg: string; stripe: string }> = {
  "Sensible Purchase":               { color: "text-emerald-400", bg: "",                  stripe: "bg-emerald-600" },
  "Manageable Pain":                 { color: "text-amber-400",   bg: "",                  stripe: "bg-amber-600" },
  "Emotionally Justified Disaster":  { color: "text-orange-400",  bg: "bg-orange-950/25",  stripe: "bg-orange-600" },
  "Dangerous":                       { color: "text-red-400",     bg: "bg-red-950/30",     stripe: "bg-red-600" },
  "Catastrophic Wallet Destruction": { color: "text-red-300",     bg: "bg-red-950/50",     stripe: "bg-red-500" },
};

// Single-column drive row — matches mockup layout
function DriveScoreRow({ metric, label }: { metric: DriveMetric; label: string }) {
  const color =
    metric.score >= 7 ? "text-emerald-400"
    : metric.score >= 5 ? "text-amber-400"
    : "text-red-500";
  return (
    <div className="flex items-start gap-4 py-3 border-b border-zinc-800/60 last:border-0">
      <span className={`text-xl font-black tabular-nums min-w-[28px] leading-none pt-0.5 ${color}`}>
        {metric.score}
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">{label}</p>
        <p className="text-zinc-400 text-sm leading-relaxed">{metric.description}</p>
      </div>
    </div>
  );
}

function WheelSpinner() {
  const spokes = [0, 72, 144, 216, 288];
  return (
    <svg className="animate-spin w-14 h-14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke="#27272a" strokeWidth="4" />
      <circle cx="24" cy="24" r="18.5" stroke="#3f3f46" strokeWidth="1" />
      <circle cx="24" cy="24" r="13" stroke="#dc2626" strokeWidth="1.5" />
      {spokes.map((angle) => (
        <line key={angle} x1="24" y1="19.5" x2="24" y2="11" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" transform={`rotate(${angle} 24 24)`} />
      ))}
      {spokes.map((angle) => {
        const rad = (angle - 90) * (Math.PI / 180);
        const r = 13;
        const cx = 24 + r * Math.cos(rad);
        const cy = 24 + r * Math.sin(rad);
        return <circle key={`nut-${angle}`} cx={cx} cy={cy} r="1.5" fill="#dc2626" />;
      })}
      <circle cx="24" cy="24" r="5" fill="#18181b" stroke="#dc2626" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="1.8" fill="#dc2626" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">{children}</p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 ${className}`}>
      {children}
    </div>
  );
}

function isSpecified(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return !["not provided", "not specified", "unknown", "n/a", "-", ""].includes(lower);
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium">
      {children}
    </span>
  );
}

function computeValueScore(a: Analysis): number | null {
  const base: Record<string, number> = {
    "Fair": 7, "Underpriced": 9, "Premium Justified": 6,
    "Overpriced": 3, "Paying the Premium": 4,
  };
  const adj: Record<string, number> = {
    "None": 0, "Mild": 0, "Moderate": -1, "High": -2, "Extreme": -3,
  };
  const b = base[a.priceVerdict?.assessment];
  if (b === undefined) return null;
  return Math.max(1, Math.min(10, b + (adj[a.enthusiastTax?.level] ?? 0)));
}

function computeCharacterScore(a: Analysis): number | null {
  const dc = a.drivingCharacter;
  if (!dc) return null;
  const scores = [
    dc.steeringFeel?.score,
    dc.engineCharacter?.score,
    dc.dailyComfort?.score,
    dc.overallFun?.score,
  ].filter((s): s is number => typeof s === "number");
  if (!scores.length) return null;
  return Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length);
}

function computeInvestmentScore(a: Analysis): number | null {
  const pain = a.ownershipPain?.score;
  const classic = a.classicPotential?.score;
  if (pain == null && classic == null) return null;
  const painScore = pain != null ? Math.max(1, Math.min(10, 10 - pain)) : null;
  const classicScore = classic ?? null;
  if (painScore != null && classicScore != null) {
    return Math.max(1, Math.min(10, Math.round(painScore * 0.6 + classicScore * 0.4)));
  }
  return painScore ?? classicScore;
}

function getQuip(section: "value" | "character" | "investment", score: number | null): string {
  if (score === null) return "";
  if (section === "value") {
    if (score <= 3) return "Mate, just don't.";
    if (score <= 5) return "Priced with optimism.";
    if (score <= 7) return "Numbers stack up.";
    return "Genuine bargain.";
  }
  if (section === "character") {
    if (score <= 3) return "It tries, we guess.";
    if (score <= 5) return "There's some there.";
    if (score <= 7) return "Worth the trouble.";
    return "Sweet as, no notes.";
  }
  if (score <= 3) return "Hard pass.";
  if (score <= 5) return "Coin flip territory.";
  if (score <= 7) return "Could work out.";
  return "Actually sensible.";
}

function ScoreChip({ label, score, onClick }: { label: string; score: number | null; onClick: () => void }) {
  const numColor =
    score === null ? "text-zinc-500"
    : score >= 7 ? "text-emerald-400"
    : score >= 5 ? "text-amber-400"
    : "text-red-400";
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600 active:scale-95 transition-all"
    >
      <span className={`text-xl font-black tabular-nums leading-none ${numColor}`}>
        {score !== null ? score : "?"}
        <span className="text-zinc-600 text-xs font-normal">/10</span>
      </span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
    </button>
  );
}

function ModPotentialCard({ data }: { data: NonNullable<Analysis["modPotential"]> }) {
  const [expanded, setExpanded] = useState(false);
  if (data.relevance === "low") return null;
  const isCollapsed = data.relevance === "medium" && !expanded;
  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Mod Potential</p>
          {data.relevance === "medium" && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              {expanded ? "Less ▲" : "More ▼"}
            </button>
          )}
        </div>
        {data.powerCeiling && (
          <p className="text-zinc-300 text-sm leading-relaxed">{data.powerCeiling}</p>
        )}
        {!isCollapsed && (
          <div className="space-y-4 mt-4">
            {data.firstMods?.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">First Mods</p>
                <ul className="space-y-1.5">
                  {data.firstMods.map((mod, i) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-400 leading-snug">
                      <span className="text-red-500 flex-shrink-0 font-black">+</span>
                      {mod}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.handlingUpgrades && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Handling Upgrades</p>
                <p className="text-zinc-400 text-sm leading-relaxed">{data.handlingUpgrades}</p>
              </div>
            )}
            {data.partsEcosystem && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Parts Ecosystem</p>
                <p className="text-zinc-400 text-sm leading-relaxed">{data.partsEcosystem}</p>
              </div>
            )}
            {data.collectorRisk && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Collector Risk</p>
                <p className="text-zinc-400 text-sm leading-relaxed">{data.collectorRisk}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function TileHeader({ label, score, quip }: { label: string; score: number | null; quip?: string }) {
  const numColor =
    score === null ? "text-zinc-600"
    : score >= 7 ? "text-emerald-500"
    : score >= 5 ? "text-amber-500"
    : "text-red-500";
  return (
    <div className="pt-2 space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">{label}</span>
        <div className="flex-1 h-px bg-zinc-800" />
        {score !== null && (
          <span className={`text-xs font-black tabular-nums ${numColor}`}>{score}/10</span>
        )}
      </div>
      {quip && (
        <p className="text-xs italic text-zinc-600 pl-0.5">{quip}</p>
      )}
    </div>
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
  const resultsRef = useRef<HTMLDivElement>(null);
  const valueTileRef = useRef<HTMLDivElement>(null);
  const characterTileRef = useRef<HTMLDivElement>(null);
  const investmentTileRef = useRef<HTMLDivElement>(null);
  const priceVerdictRef = useRef<HTMLDivElement>(null);
  const ownerVibeRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const valueScore = result ? computeValueScore(result) : null;
  const characterScore = result ? computeCharacterScore(result) : null;
  const investmentScore = result ? computeInvestmentScore(result) : null;

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
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
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
                  On the listing page, select all (<kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Ctrl+A</kbd>) then copy (<kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Ctrl+C</kbd>), then paste below.
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

        {/* Results anchor */}
        <div ref={resultsRef} />

        {/* Loading */}
        {loading && (
          <Card className="p-10 flex flex-col items-center gap-5">
            <WheelSpinner />
            <div className="text-center">
              <p className="text-white font-bold text-sm">Consulting the oracle</p>
              <p className="text-zinc-500 text-xs mt-1">Reading the listing, checking the numbers...</p>
            </div>
          </Card>
        )}

        {/* ── RESULTS ──────────────────────────────────────────── */}
        {result && !loading && (
          <div className="space-y-4">

            {/* ── HERO TILE ───────────────────────────────────── */}
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-transparent" />
              <div className="p-6 space-y-5">

                {/* Year / import / location + price */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 pt-1">
                    {result.vehicle.year}
                    {isSpecified(result.vehicle.importStatus) ? ` · ${result.vehicle.importStatus}` : ""}
                    {isSpecified(result.vehicle.location) ? ` · ${result.vehicle.location}` : ""}
                  </p>
                  {result.vehicle.price && (
                    <div className="bg-red-600 rounded-xl px-4 py-2 text-right flex-shrink-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-red-200 opacity-80">Asking</p>
                      <p className="text-xl font-black text-white">{result.vehicle.price}</p>
                    </div>
                  )}
                </div>

                {/* Make / model / variant */}
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
                    {result.vehicle.make} {result.vehicle.model}
                  </h3>
                  {result.vehicle.variant && (
                    <p className="text-zinc-400 font-medium mt-0.5">{result.vehicle.variant}</p>
                  )}
                </div>

                {/* Spec pills + label badge + owner vibe */}
                <div className="flex flex-wrap items-center gap-2">
                  {isSpecified(result.vehicle.mileage) && <Pill>{result.vehicle.mileage}</Pill>}
                  {isSpecified(result.vehicle.transmission) && <Pill>{result.vehicle.transmission}</Pill>}
                  {isSpecified(result.vehicle.colour) && <Pill>{result.vehicle.colour}</Pill>}
                  {result.label && (
                    <button
                      onClick={() => priceVerdictRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-all hover:brightness-125 ${LABEL_STYLES[result.label] ?? "bg-zinc-700 text-white"}`}
                    >
                      {result.label}
                    </button>
                  )}
                  {result.ownerVibe?.label && (
                    <button
                      onClick={() => ownerVibeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full cursor-pointer active:scale-95 transition-all hover:brightness-125 ${OWNER_VIBE_STYLES[result.ownerVibe.label] ?? "bg-zinc-700 text-zinc-300"}`}
                    >
                      {result.ownerVibe.label}
                    </button>
                  )}
                </div>

                {/* Pull-quote */}
                {result.whatMakesSpecial && (
                  <div className="pl-4 border-l-[3px] border-red-500">
                    <p className="text-white text-base font-medium italic leading-snug">{result.whatMakesSpecial}</p>
                  </div>
                )}

                {/* Verdict */}
                {result.verdict && (
                  <div className="pl-4 border-l-2 border-red-600/70">
                    <p className="text-zinc-300 leading-relaxed text-sm italic">{result.verdict}</p>
                  </div>
                )}

                {/* Performance specs */}
                {result.performanceSpecs?.engine && (
                  <div className="bg-zinc-800/30 rounded-xl border border-zinc-800 p-4">
                    <SectionLabel>Performance Specs</SectionLabel>
                    <p className="text-zinc-200 font-bold text-sm mb-4">{result.performanceSpecs.engine}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {result.performanceSpecs.powerKw > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Power</p>
                          <p className="text-zinc-100 font-black text-sm tabular-nums">
                            {result.performanceSpecs.powerKw}kW
                            {result.performanceSpecs.powerHp > 0 && <span className="text-zinc-500 font-normal"> / {result.performanceSpecs.powerHp}hp</span>}
                          </p>
                        </div>
                      )}
                      {result.performanceSpecs.torqueNm > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Torque</p>
                          <p className="text-zinc-100 font-black text-sm tabular-nums">
                            {result.performanceSpecs.torqueNm}Nm
                            {result.performanceSpecs.torqueRpm && <span className="text-zinc-500 font-normal"> @ {result.performanceSpecs.torqueRpm}rpm</span>}
                          </p>
                        </div>
                      )}
                      {result.performanceSpecs.zeroToHundred && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">0–100 km/h</p>
                          <p className="text-zinc-100 font-black text-sm">{result.performanceSpecs.zeroToHundred}</p>
                        </div>
                      )}
                      {result.performanceSpecs.kerbWeightKg > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Kerb Weight</p>
                          <p className="text-zinc-100 font-black text-sm tabular-nums">{result.performanceSpecs.kerbWeightKg}kg</p>
                        </div>
                      )}
                      {result.performanceSpecs.drivetrain && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Drivetrain</p>
                          <p className="text-zinc-100 font-black text-sm">{result.performanceSpecs.drivetrain}</p>
                        </div>
                      )}
                    </div>
                    {result.performanceSpecs.jdmNote && (
                      <p className="text-amber-500/80 text-xs mt-4 pt-3 border-t border-zinc-800 leading-snug">{result.performanceSpecs.jdmNote}</p>
                    )}
                  </div>
                )}

                {/* Score chips — tap to scroll */}
                <div className="flex gap-2.5">
                  <ScoreChip
                    label="Value"
                    score={valueScore}
                    onClick={() => valueTileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  />
                  <ScoreChip
                    label="Character"
                    score={characterScore}
                    onClick={() => characterTileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  />
                  <ScoreChip
                    label="Investment"
                    score={investmentScore}
                    onClick={() => investmentTileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  />
                </div>

              </div>
            </Card>

            {/* ── VALUE TILE ──────────────────────────────────── */}
            <div id="value" ref={valueTileRef} className="scroll-mt-4 space-y-4">
              <TileHeader label="Value" score={valueScore} quip={getQuip("value", valueScore)} />

              {result.priceVerdict && (
                <div ref={priceVerdictRef} className="scroll-mt-4">
                  <Card className="p-5">
                    <SectionLabel>Price Analysis</SectionLabel>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className={`text-xl font-black ${PRICE_ASSESSMENT_STYLES[result.priceVerdict.assessment] ?? "text-zinc-300"}`}>
                        {result.priceVerdict.assessment}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">{result.priceVerdict.reason}</p>
                  </Card>
                </div>
              )}

              {result.enthusiastTax && (
                <Card className="p-5">
                  <SectionLabel>Price Reality Check</SectionLabel>
                  <div className="mb-4">
                    <span className={`text-sm font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${TAX_LEVEL_STYLES[result.enthusiastTax.level]?.badge ?? "bg-zinc-700 text-zinc-300"}`}>
                      {result.enthusiastTax.level}
                    </span>
                  </div>
                  {result.enthusiastTax.reasons?.length > 0 && (
                    <ul className="space-y-2">
                      {result.enthusiastTax.reasons.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-400 leading-snug">
                          <span className={`flex-shrink-0 font-bold ${TAX_LEVEL_STYLES[result.enthusiastTax.level]?.icon ?? "text-zinc-500"}`}>$</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {result.priceOutlook && (
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <SectionLabel>Price Outlook</SectionLabel>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${TREND_BADGE_STYLES[result.priceOutlook.trend] ?? "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}>
                      {result.priceOutlook.trend}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">{result.priceOutlook.reason}</p>
                  <p className="text-zinc-600 text-[10px] mt-2">Based on enthusiast market trends, not live pricing data.</p>
                </Card>
              )}

              {result.worstFinancialDecision && (() => {
                const style = FINANCIAL_RATING_STYLES[result.worstFinancialDecision.rating] ?? { color: "text-zinc-300", bg: "", stripe: "bg-zinc-700" };
                return (
                  <div className={`rounded-2xl border border-zinc-800 overflow-hidden ${style.bg}`}>
                    <div className={`h-1 ${style.stripe}`} />
                    <div className="p-5">
                      <SectionLabel>Wallet Damage Rating</SectionLabel>
                      <p className={`text-3xl font-black mb-4 leading-tight ${style.color}`}>
                        {result.worstFinancialDecision.rating}
                      </p>
                      {result.worstFinancialDecision.reasons?.length > 0 && (
                        <ul className="space-y-2.5">
                          {result.worstFinancialDecision.reasons.map((r, i) => (
                            <li key={i} className="flex gap-2 text-sm text-zinc-300 leading-snug">
                              <span className={`flex-shrink-0 font-black ${style.color}`}>→</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── CHARACTER TILE ──────────────────────────────── */}
            <div id="character" ref={characterTileRef} className="scroll-mt-4 space-y-4">
              <TileHeader label="Character" score={characterScore} quip={getQuip("character", characterScore)} />

              {/* Driving character — single column rows */}
              {result.drivingCharacter && (
                <Card className="p-5">
                  <SectionLabel>Driving Character</SectionLabel>
                  <div className="space-y-0">
                    <DriveScoreRow metric={result.drivingCharacter.steeringFeel} label="Steering" />
                    <DriveScoreRow metric={result.drivingCharacter.engineCharacter} label="Engine" />
                    <DriveScoreRow metric={result.drivingCharacter.dailyComfort} label="Daily" />
                    <DriveScoreRow metric={result.drivingCharacter.overallFun} label="Fun" />
                  </div>
                  {result.drivingCharacter.summary && (
                    <p className="text-zinc-400 text-xs leading-relaxed border-t border-zinc-800 pt-3 mt-1">
                      {result.drivingCharacter.summary}
                    </p>
                  )}
                </Card>
              )}

              {/* Why enthusiasts care */}
              {result.whyEnthusiastsCare && (
                <Card className="p-5">
                  <SectionLabel>Why Enthusiasts Care</SectionLabel>
                  <p className="text-zinc-300 text-sm leading-relaxed">{result.whyEnthusiastsCare}</p>
                </Card>
              )}

              {/* Owner vibe */}
              {result.ownerVibe?.label && (
                <div ref={ownerVibeRef} className="scroll-mt-4">
                  <Card className="p-5">
                    <SectionLabel>Owner Vibe</SectionLabel>
                    <div className="mb-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${OWNER_VIBE_STYLES[result.ownerVibe.label] ?? "bg-zinc-700 text-zinc-300"}`}>
                        {result.ownerVibe.label}
                      </span>
                    </div>
                    {result.ownerVibe.reasoning && (
                      <p className="text-zinc-400 text-sm leading-relaxed">{result.ownerVibe.reasoning}</p>
                    )}
                  </Card>
                </div>
              )}

              {/* Cars & Coffee + Community Credibility */}
              {(result.carsCoffee || result.communityCredibility) && (
                <Card className="p-5 space-y-4">
                  {result.carsCoffee && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>Cars &amp; Coffee</SectionLabel>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${RATING_BADGE_STYLES[result.carsCoffee.rating] ?? "bg-zinc-800 text-zinc-300"}`}>
                          {result.carsCoffee.rating}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed">{result.carsCoffee.description}</p>
                    </div>
                  )}
                  {result.carsCoffee && result.communityCredibility && (
                    <div className="h-px bg-zinc-800" />
                  )}
                  {result.communityCredibility && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>Community Credibility</SectionLabel>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${RATING_BADGE_STYLES[result.communityCredibility.rating] ?? "bg-zinc-800 text-zinc-300"}`}>
                          {result.communityCredibility.rating}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed">{result.communityCredibility.description}</p>
                    </div>
                  )}
                  {result.socialStanding && (
                    <>
                      <div className="h-px bg-zinc-800" />
                      <p className="text-zinc-400 text-sm italic leading-relaxed pl-3 border-l-2 border-red-600/60">
                        {result.socialStanding}
                      </p>
                    </>
                  )}
                </Card>
              )}

              {/* Mod potential */}
              {result.modPotential && <ModPotentialCard data={result.modPotential} />}

            </div>

            {/* ── INVESTMENT TILE ─────────────────────────────── */}
            <div id="investment" ref={investmentTileRef} className="scroll-mt-4 space-y-4">
              <TileHeader label="Investment" score={investmentScore} quip={getQuip("investment", investmentScore)} />

              {/* Ownership pain — failure points with red left border */}
              {result.ownershipPain && (
                <Card className="p-5">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div>
                      <SectionLabel>Reliability Risk</SectionLabel>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-black tabular-nums leading-none ${result.ownershipPain.score >= 8 ? "text-red-400" : result.ownershipPain.score >= 5 ? "text-amber-400" : "text-emerald-400"}`}>
                          {result.ownershipPain.score}
                        </span>
                        <span className="text-zinc-600 text-lg">/10</span>
                      </div>
                      <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${result.ownershipPain.score >= 8 ? "text-red-500" : result.ownershipPain.score >= 5 ? "text-amber-500" : "text-emerald-500"}`}>
                        {result.ownershipPain.score >= 8 ? "High Pain" : result.ownershipPain.score >= 5 ? "Moderate" : "Low Pain"}
                      </p>
                    </div>
                  </div>
                  {result.ownershipPain.issues?.length > 0 && (
                    <ul className="space-y-3 mt-1">
                      {result.ownershipPain.issues.map((issue, i) => (
                        <li key={i} className="pl-3 border-l-[3px] border-red-600 py-1">
                          <p className="font-black text-zinc-100 text-sm">{issue.title}</p>
                          {issue.detail && (
                            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{issue.detail}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {/* Red flags */}
              {result.redFlags?.length > 0 && (
                <div className="rounded-2xl border border-red-600 overflow-hidden bg-red-950/40">
                  <div className="bg-red-700 px-5 py-3 flex items-center gap-2.5">
                    <span className="text-white text-sm">⚠️</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      Red Flags — Read Before Buying
                    </span>
                  </div>
                  <ul className="divide-y divide-red-900/50">
                    {result.redFlags.map((f, i) => (
                      <li key={i} className="px-5 py-4 flex gap-3">
                        <span className="text-red-400 flex-shrink-0 text-base leading-tight mt-0.5">⚠</span>
                        <div>
                          <p className="font-black text-red-200 text-sm">{f.flag}</p>
                          <p className="text-red-300/80 text-xs mt-1 leading-relaxed">{f.explanation}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regret Risk + Market Trend */}
              {(result.regretRisk || result.marketTrend) && (
                <Card className="p-5 space-y-4">
                  {result.regretRisk && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>Regret Risk</SectionLabel>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${RATING_BADGE_STYLES[result.regretRisk.level] ?? "bg-zinc-800 text-zinc-300"}`}>
                          {result.regretRisk.level}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed">{result.regretRisk.reason}</p>
                    </div>
                  )}
                  {result.regretRisk && result.marketTrend && (
                    <div className="h-px bg-zinc-800" />
                  )}
                  {result.marketTrend && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>Market Trend</SectionLabel>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${TREND_BADGE_STYLES[result.marketTrend.trend] ?? "bg-zinc-800 text-zinc-300"}`}>
                          {result.marketTrend.trend}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed">{result.marketTrend.reason}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Future classic potential */}
              {result.classicPotential && (
                <Card className="p-5">
                  <SectionLabel>Future Classic Potential</SectionLabel>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-amber-400 tabular-nums">{result.classicPotential.score}</span>
                    <span className="text-zinc-600 text-lg">/10</span>
                  </div>
                  {result.classicPotential.reasons?.length > 0 && (
                    <ul className="space-y-1.5">
                      {result.classicPotential.reasons.map((r, i) => (
                        <li key={i} className="flex gap-2 text-xs text-zinc-400">
                          <span className="text-amber-600 flex-shrink-0">▸</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </div>

            {/* ── SPEC SIGNIFICANCE ───────────────────────────── */}
            {result.specSignificance?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Spec Significance</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <Card className="p-5">
                  <ul className="space-y-3">
                    {result.specSignificance.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-red-500 flex-shrink-0 font-black mt-0.5">+</span>
                        <div>
                          <span className="font-bold text-zinc-200 text-sm">{s.item}</span>
                          {s.note && <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{s.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}

            {/* ── ASK THE SELLER ──────────────────────────────── */}
            {result.questionsToAsk?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Ask the Seller</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <Card className="p-5">
                  <ol className="space-y-3">
                    {result.questionsToAsk.map((q, i) => (
                      <li key={i} className="flex gap-3 text-sm border-b border-zinc-800/60 pb-3 last:border-0 last:pb-0">
                        <span className="text-red-600 font-black w-4 flex-shrink-0 tabular-nums">{i + 1}</span>
                        <span className="text-zinc-300 leading-snug">{q}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            )}

            {/* ── THE ENTHUSIAST TAKE ─────────────────────────── */}
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
              onClick={() => {
                setResult(null);
                setUrl("");
                setImages([]);
                setPastedText("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
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
