"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";

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
  enthusiastTax: { level: string; premium?: string; reasons: string[] };
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
  alternatives?: {
    name: string;
    whySuited: string;
    howDiffers: string;
    priceRange: string;
  }[];
  investmentScore?: number;
  vibeScore?: number;
};

// ── Verdict badge colour system ───────────────────────────────
// Warm-tuned signal palette to sit on the carbon/ember theme
type VerdictTheme = { bg: string; border: string; text: string };
const V_RED:     VerdictTheme = { bg: "#2a100b", border: "#803023", text: "#ff9d8a" };
const V_AMBER:   VerdictTheme = { bg: "#271b06", border: "#7a5a1e", text: "#ffc96b" };
const V_GREEN:   VerdictTheme = { bg: "#0e2316", border: "#2f5e40", text: "#93dbad" };
const V_BLUE:    VerdictTheme = { bg: "#101b29", border: "#31506f", text: "#a3bedf" };
const V_NEUTRAL: VerdictTheme = { bg: "#1c1c20", border: "#3a3a42", text: "#a6a29a" };

const VERDICT_THEME_MAP: Record<string, VerdictTheme> = {
  // Hero labels
  "Hidden Gem": V_GREEN, "Future Classic": V_GREEN, "Underrated": V_GREEN,
  "Premium Asking Price": V_AMBER, "Overrated": V_AMBER,
  "Cheap Thrill": V_BLUE, "Peak Daily Driver": V_BLUE,
  "Money Pit": V_RED,
  // Price assessment
  "Fair": V_GREEN, "Underpriced": V_GREEN, "Premium Justified": V_GREEN,
  "Overpriced": V_RED, "Paying the Premium": V_AMBER,
  // Enthusiast tax level
  "None": V_BLUE, "Mild": V_AMBER, "Moderate": V_AMBER,
  "High": V_RED, "Extreme": V_RED,
  // Price / market trend
  "Stable": V_BLUE, "Rising": V_GREEN, "Falling": V_RED, "Declining": V_RED,
  // Wallet damage rating
  "Sensible Purchase": V_GREEN,
  "Manageable Pain": V_AMBER,
  "Emotionally Justified Disaster": V_AMBER,
  "Dangerous": V_RED,
  "Catastrophic Wallet Destruction": V_RED,
  // Reliability risk derived labels
  "Low Pain": V_GREEN, "High Pain": V_RED,
  // Regret risk level  ("Moderate" and "High" already covered above)
  "Low": V_GREEN, "Medium": V_AMBER,
  // Owner vibe
  "Mature Enthusiast Owner": V_GREEN, "Grandpa-Owned Gem": V_GREEN,
  "Weekend Warrior": V_BLUE, "Rich Dentist Spec": V_BLUE,
  "Motivated Seller": V_AMBER, "Deferred Maintenance Energy": V_AMBER,
  "Drift Missile History": V_AMBER, "TikTok Build": V_AMBER,
  "Optimistic Dreamer": V_AMBER, "Dealer Dressed as Private": V_RED,
};

function themeToStyle(t: VerdictTheme) {
  return {
    display: "inline-block" as const,
    backgroundColor: t.bg,
    border: `1px solid ${t.border}`,
    color: t.text,
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    padding: "4px 10px",
    borderRadius: "3px",
  };
}

function verdictBadgeStyle(verdict: string) {
  return themeToStyle(VERDICT_THEME_MAP[verdict] ?? V_NEUTRAL);
}

function VerdictBadge({ verdict }: { verdict: string }) {
  return <span style={verdictBadgeStyle(verdict)}>{verdict}</span>;
}

const RATING_THEME_MAP: Record<string, VerdictTheme> = {
  "High": V_GREEN, "Medium": V_BLUE, "Low": V_AMBER,
};

function RatingBadge({ rating }: { rating: string }) {
  return <span style={themeToStyle(RATING_THEME_MAP[rating] ?? V_NEUTRAL)}>{rating}</span>;
}

const TAX_LEVEL_STYLES: Record<string, { icon: string }> = {
  "None":     { icon: "text-ink-faint" },
  "Mild":     { icon: "text-emerald-500" },
  "Moderate": { icon: "text-amber-500" },
  "High":     { icon: "text-orange-500" },
  "Extreme":  { icon: "text-red-500" },
};



const FINANCIAL_RATING_STYLES: Record<string, { color: string; bg: string; stripe: string }> = {
  "Sensible Purchase":               { color: "text-emerald-400", bg: "",                  stripe: "bg-emerald-600" },
  "Manageable Pain":                 { color: "text-amber-400",   bg: "",                  stripe: "bg-amber-600" },
  "Emotionally Justified Disaster":  { color: "text-orange-400",  bg: "bg-orange-950/25",  stripe: "bg-orange-600" },
  "Dangerous":                       { color: "text-red-400",     bg: "bg-red-950/30",     stripe: "bg-red-600" },
  "Catastrophic Wallet Destruction": { color: "text-red-300",     bg: "bg-red-950/50",     stripe: "bg-red-500" },
};
// color key kept for the → arrow bullets in wallet damage reasons

// Single-column drive row — matches mockup layout
function DriveScoreRow({ metric, label }: { metric: DriveMetric; label: string }) {
  const color =
    metric.score >= 7 ? "text-emerald-400"
    : metric.score >= 5 ? "text-amber-400"
    : "text-red-500";
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-line last:border-0">
      <span className={`font-mono text-xl font-bold tabular-nums min-w-[30px] leading-none pt-0.5 ${color}`}>
        {metric.score}
      </span>
      <div>
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint mb-1.5">{label}</p>
        <p className="text-ink-muted text-sm leading-relaxed">{metric.description}</p>
      </div>
    </div>
  );
}

const LOADING_MESSAGES = [
  "Consulting the oracle...",
  "Asking someone who actually knows their stuff...",
  "Checking if the service history adds up...",
  "Sniffing for oil leaks...",
  "Counting the previous owners...",
  "Checking if the mods are actually worth anything...",
  "Reading the CarJam tea leaves...",
  "Asking a mate who owns one...",
  "Detecting enthusiast tax...",
  "Checking if the asking price is a joke...",
  "Scanning for Trade Me listing fiction...",
  "Running the numbers through the shed...",
  "Separating the good ones from the money pits...",
  "Cross-referencing with every forum thread ever written...",
];

function RotatingMessage() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="font-mono text-ink-muted text-xs mt-2 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {LOADING_MESSAGES[index]}
    </p>
  );
}

function WheelSpinner() {
  const spokes = [0, 72, 144, 216, 288];
  return (
    <svg className="animate-spin w-14 h-14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke="#232328" strokeWidth="4" />
      <circle cx="24" cy="24" r="18.5" stroke="#3a3a42" strokeWidth="1" />
      <circle cx="24" cy="24" r="13" stroke="#e89a2b" strokeWidth="1.5" />
      {spokes.map((angle) => (
        <line key={angle} x1="24" y1="19.5" x2="24" y2="11" stroke="#e89a2b" strokeWidth="2" strokeLinecap="round" transform={`rotate(${angle} 24 24)`} />
      ))}
      {spokes.map((angle) => {
        const rad = (angle - 90) * (Math.PI / 180);
        const r = 13;
        const cx = 24 + r * Math.cos(rad);
        const cy = 24 + r * Math.sin(rad);
        return <circle key={`nut-${angle}`} cx={cx} cy={cy} r="1.5" fill="#e89a2b" />;
      })}
      <circle cx="24" cy="24" r="5" fill="#131316" stroke="#e89a2b" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="1.8" fill="#e89a2b" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-3">{children}</p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-white/[0.02] ${className}`}>
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
    <span className="inline-flex items-center px-2.5 py-1 rounded border border-line bg-white/[0.04] text-ink-muted font-mono text-[11px]">
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
    score === null ? "text-ink-faint"
    : score >= 7 ? "text-emerald-400"
    : score >= 5 ? "text-amber-400"
    : "text-red-400";
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-3.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-line hover:border-line-strong active:scale-95 transition-all"
    >
      <span className={`font-mono text-2xl font-bold tabular-nums leading-none ${numColor}`}>
        {score !== null ? score : "?"}
        <span className="text-ink-faint text-xs font-normal">/10</span>
      </span>
      <span className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint">{label}</span>
    </button>
  );
}

function ModPotentialCard({ data }: { data: NonNullable<Analysis["modPotential"]> }) {
  const [expanded, setExpanded] = useState(false);
  if (data.relevance === "low") return null;
  const isCollapsed = data.relevance === "medium" && !expanded;
  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">Mod Potential</p>
          {data.relevance === "medium" && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-ink-faint hover:text-ink-muted transition-colors flex items-center gap-1"
            >
              {expanded ? "Less ▲" : "More ▼"}
            </button>
          )}
        </div>
        {data.powerCeiling && (
          <p className="text-ink-muted text-sm leading-relaxed">{data.powerCeiling}</p>
        )}
        {!isCollapsed && (
          <div className="space-y-4 mt-4">
            {data.firstMods?.length > 0 && (
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-2">First Mods</p>
                <ul className="space-y-1.5">
                  {data.firstMods.map((mod, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-muted leading-snug">
                      <span className="text-ember-400 flex-shrink-0 font-bold">+</span>
                      {mod}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.handlingUpgrades && (
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Handling Upgrades</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.handlingUpgrades}</p>
              </div>
            )}
            {data.partsEcosystem && (
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Parts Ecosystem</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.partsEcosystem}</p>
              </div>
            )}
            {data.collectorRisk && (
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Collector Risk</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.collectorRisk}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function TileHeader({ label, score, quip, index }: { label: string; score: number | null; quip?: string; index?: string }) {
  const numColor =
    score === null ? "text-ink-faint"
    : score >= 7 ? "text-emerald-400"
    : score >= 5 ? "text-amber-400"
    : "text-red-400";
  return (
    <div className="pt-4 space-y-1.5">
      <div className="flex items-baseline gap-3">
        {index && (
          <span className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink/15 select-none">{index}</span>
        )}
        <span className="font-display text-base font-bold uppercase tracking-[0.14em] text-ink">{label}</span>
        <div className="flex-1 h-px bg-line self-center" />
        {score !== null && (
          <span className={`font-mono text-sm font-bold tabular-nums ${numColor}`}>
            {score}<span className="text-ink-faint text-xs font-normal">/10</span>
          </span>
        )}
      </div>
      {quip && (
        <p className="font-mono text-[11px] italic text-ink-faint pl-0.5">{quip}</p>
      )}
    </div>
  );
}


function HomeContent() {
  const [mode, setMode] = useState<"text" | "images">("text");
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

  const characterScore = result ? computeCharacterScore(result) : null;

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
        setInputCollapsed(true);
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

      {/* Masthead */}
      <header className="sticky top-0 z-40 px-6 pt-4 pb-3.5 border-b border-line bg-carbon-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-extrabold tracking-tight uppercase leading-none">
              <span className="text-ink">Motor</span>
              <span className="text-ember-400">mind</span>
            </h1>
            <div className="h-3.5 w-px bg-line-strong" />
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint">NZ Car Copilot</span>
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-ember-400 animate-pulse" />
        </div>
      </header>

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
                          onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ember-500 rounded-full text-carbon-950 text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
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
                  className="w-full bg-carbon-900/80 border border-line rounded-lg px-4 py-3.5 text-sm text-ink placeholder:text-ink-faint placeholder:font-mono focus:outline-none focus:border-ember-500/60 transition-all resize-none"
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
              <div className="flex gap-3 bg-ember-500/10 border border-ember-600/40 rounded-lg px-4 py-3">
                <span className="text-ember-400 flex-shrink-0 font-bold">!</span>
                <p className="text-ember-300/90 text-sm leading-relaxed">{error}</p>
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

          </div>{/* end space-y-6 */}
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

        {/* ── RESULTS ──────────────────────────────────────────── */}
        {result && !loading && (
          <div className="space-y-4">

            {/* ── HERO TILE ───────────────────────────────────── */}
            <Card className="overflow-hidden">
              <div className="h-px bg-gradient-to-r from-ember-500 via-ember-500/40 to-transparent" />
              <div className="p-6 sm:p-7 space-y-5">

                {/* Year / import / location + price */}
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-ink-faint pt-1.5">
                    {result.vehicle.year}
                    {isSpecified(result.vehicle.importStatus) ? ` · ${result.vehicle.importStatus}` : ""}
                    {isSpecified(result.vehicle.location) ? ` · ${result.vehicle.location}` : ""}
                  </p>
                  {result.vehicle.price && (
                    <div className="bg-ember-500 rounded-lg px-4 py-2 text-right flex-shrink-0">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-carbon-950/60">Asking</p>
                      <p className="font-mono text-xl font-bold text-carbon-950 tabular-nums">{result.vehicle.price}</p>
                    </div>
                  )}
                </div>

                {/* Make / model / variant */}
                <div>
                  <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-tight">
                    {result.vehicle.make} {result.vehicle.model}
                  </h3>
                  {result.vehicle.variant && (
                    <p className="text-ink-muted font-medium mt-1">{result.vehicle.variant}</p>
                  )}
                </div>

                {/* Spec pills + label badge + owner vibe */}
                <div className="flex flex-wrap items-center gap-2">
                  {isSpecified(result.vehicle.mileage) && <Pill>{result.vehicle.mileage}</Pill>}
                  {isSpecified(result.vehicle.transmission) && <Pill>{result.vehicle.transmission}</Pill>}
                  {isSpecified(result.vehicle.colour) && <Pill>{result.vehicle.colour}</Pill>}
                  {result.label && (
                    <button
                      title="Tap to view details"
                      onClick={() => priceVerdictRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      style={verdictBadgeStyle(result.label)}
                      className="inline-flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                    >
                      {result.label}
                      <span className="opacity-70 text-[9px] leading-none">↓</span>
                    </button>
                  )}
                  {result.ownerVibe?.label && (
                    <button
                      title="Tap to view details"
                      onClick={() => ownerVibeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      style={verdictBadgeStyle(result.ownerVibe.label)}
                      className="inline-flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                    >
                      {result.ownerVibe.label}
                      <span className="opacity-70 text-[9px] leading-none">↓</span>
                    </button>
                  )}
                </div>

                {/* Pull-quote */}
                {result.whatMakesSpecial && (
                  <div className="pl-4 border-l-2 border-ember-400">
                    <p className="text-ink text-[17px] font-medium italic leading-snug">{result.whatMakesSpecial}</p>
                  </div>
                )}

                {/* Verdict */}
                {result.verdict && (
                  <div className="pl-4 border-l border-line-strong">
                    <p className="text-ink-muted leading-relaxed text-sm italic">{result.verdict}</p>
                  </div>
                )}

                {/* Performance specs */}
                {result.performanceSpecs?.engine && (
                  <div className="bg-carbon-900/60 rounded-lg border border-line p-5">
                    <SectionLabel>Performance Specs</SectionLabel>
                    <p className="font-mono text-ink font-bold text-sm mb-5">{result.performanceSpecs.engine}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                      {result.performanceSpecs.powerKw > 0 && (
                        <div>
                          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Power</p>
                          <p className="font-mono text-ink font-bold text-sm tabular-nums">
                            {result.performanceSpecs.powerKw}kW
                            {result.performanceSpecs.powerHp > 0 && <span className="text-ink-faint font-normal"> / {result.performanceSpecs.powerHp}hp</span>}
                          </p>
                        </div>
                      )}
                      {result.performanceSpecs.torqueNm > 0 && (
                        <div>
                          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Torque</p>
                          <p className="font-mono text-ink font-bold text-sm tabular-nums">
                            {result.performanceSpecs.torqueNm}Nm
                            {result.performanceSpecs.torqueRpm && <span className="text-ink-faint font-normal"> @ {result.performanceSpecs.torqueRpm}rpm</span>}
                          </p>
                        </div>
                      )}
                      {result.performanceSpecs.zeroToHundred && (
                        <div>
                          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">0–100 km/h</p>
                          <p className="font-mono text-ink font-bold text-sm tabular-nums">{result.performanceSpecs.zeroToHundred}</p>
                        </div>
                      )}
                      {result.performanceSpecs.kerbWeightKg > 0 && (
                        <div>
                          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Kerb Weight</p>
                          <p className="font-mono text-ink font-bold text-sm tabular-nums">{result.performanceSpecs.kerbWeightKg}kg</p>
                        </div>
                      )}
                      {result.performanceSpecs.drivetrain && (
                        <div>
                          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Drivetrain</p>
                          <p className="font-mono text-ink font-bold text-sm">{result.performanceSpecs.drivetrain}</p>
                        </div>
                      )}
                    </div>
                    {result.performanceSpecs.jdmNote && (
                      <p className="text-ember-300/80 text-xs mt-5 pt-4 border-t border-line leading-snug">{result.performanceSpecs.jdmNote}</p>
                    )}
                  </div>
                )}

                {/* Score chips — tap to scroll */}
                <div className="flex gap-2.5">
                  <ScoreChip
                    label="Investment"
                    score={result.investmentScore ?? null}
                    onClick={() => valueTileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  />
                  <ScoreChip
                    label="Character"
                    score={characterScore}
                    onClick={() => characterTileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  />
                  <ScoreChip
                    label="Street Cred"
                    score={result.vibeScore ?? null}
                    onClick={() => investmentTileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  />
                </div>

              </div>
            </Card>

            {/* ── SECTION 1: INVESTMENT ───────────────────────── */}
            <div id="investment" ref={valueTileRef} className="scroll-mt-4 space-y-4">
              <TileHeader index="01" label="Investment" score={result.investmentScore ?? null} quip={getQuip("investment", result.investmentScore ?? null)} />

              {/* Price Analysis */}
              {result.priceVerdict && (
                <div ref={priceVerdictRef} className="scroll-mt-4">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <SectionLabel>Price Analysis</SectionLabel>
                      <VerdictBadge verdict={result.priceVerdict.assessment} />
                    </div>
                    <p className="text-ink-muted text-sm leading-relaxed">{result.priceVerdict.reason}</p>
                  </Card>
                </div>
              )}

              {/* Price Reality Check */}
              {result.enthusiastTax && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <SectionLabel>Enthusiast Tax</SectionLabel>
                    {result.enthusiastTax.premium && (
                      <span style={themeToStyle(VERDICT_THEME_MAP[result.enthusiastTax.level] ?? V_NEUTRAL)}>
                        {result.enthusiastTax.premium}
                      </span>
                    )}
                  </div>
                  {result.enthusiastTax.reasons?.length > 0 && (
                    <ul className="space-y-2.5">
                      {result.enthusiastTax.reasons.map((r, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-ink-muted leading-snug">
                          <span className={`flex-shrink-0 font-mono font-bold ${TAX_LEVEL_STYLES[result.enthusiastTax.level]?.icon ?? "text-ink-faint"}`}>$</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {/* Price Outlook */}
              {result.priceOutlook && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel>Price Outlook</SectionLabel>
                    <VerdictBadge verdict={result.priceOutlook.trend} />
                  </div>
                  <p className="text-ink-muted text-sm leading-relaxed">{result.priceOutlook.reason}</p>
                  <p className="font-mono text-ink-faint text-[10px] mt-2.5">Based on enthusiast market trends, not live pricing data.</p>
                </Card>
              )}

              {/* Wallet Damage Rating */}
              {result.worstFinancialDecision && (() => {
                const style = FINANCIAL_RATING_STYLES[result.worstFinancialDecision.rating] ?? { color: "text-ink-muted", bg: "", stripe: "bg-carbon-700" };
                return (
                  <div className={`rounded-xl border border-line overflow-hidden ${style.bg}`}>
                    <div className={`h-1 ${style.stripe}`} />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <SectionLabel>Wallet Damage Rating</SectionLabel>
                        <VerdictBadge verdict={result.worstFinancialDecision.rating} />
                      </div>
                      {result.worstFinancialDecision.reasons?.length > 0 && (
                        <ul className="space-y-2.5">
                          {result.worstFinancialDecision.reasons.map((r, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-ink/85 leading-snug">
                              <span className={`flex-shrink-0 font-mono font-bold ${style.color}`}>→</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Reliability Risk */}
              {result.ownershipPain && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <SectionLabel>Reliability Risk</SectionLabel>
                    <VerdictBadge verdict={result.ownershipPain.score >= 8 ? "High Pain" : result.ownershipPain.score >= 5 ? "Moderate" : "Low Pain"} />
                  </div>
                  {result.ownershipPain.issues?.length > 0 && (
                    <ul className="space-y-3.5 mt-1">
                      {result.ownershipPain.issues.map((issue, i) => (
                        <li key={i} className="pl-3.5 border-l-2 border-ember-500 py-0.5">
                          <p className="font-bold text-ink text-sm">{issue.title}</p>
                          {issue.detail && (
                            <p className="text-ink-faint text-xs mt-1 leading-relaxed">{issue.detail}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {/* Red flags */}
              {result.redFlags?.length > 0 && (
                <div className="rounded-xl border border-red-500/50 overflow-hidden bg-red-950/25">
                  <div className="bg-red-600 px-5 py-3 flex items-center gap-2.5">
                    <span className="text-white text-sm">⚠️</span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                      Red Flags — Read Before Buying
                    </span>
                  </div>
                  <ul className="divide-y divide-red-900/40">
                    {result.redFlags.map((f, i) => (
                      <li key={i} className="px-5 py-4 flex gap-3">
                        <span className="text-red-400 flex-shrink-0 text-base leading-tight mt-0.5">⚠</span>
                        <div>
                          <p className="font-bold text-red-200 text-sm">{f.flag}</p>
                          <p className="text-red-300/80 text-xs mt-1 leading-relaxed">{f.explanation}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Market Trend */}
              {result.marketTrend && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel>Market Trend</SectionLabel>
                    <VerdictBadge verdict={result.marketTrend.trend} />
                  </div>
                  <p className="text-ink-muted text-sm leading-relaxed">{result.marketTrend.reason}</p>
                </Card>
              )}

              {/* Future Classic Potential */}
              {result.classicPotential && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <SectionLabel>Future Classic Potential</SectionLabel>
                    <span className="font-mono text-xl font-bold text-ember-400 tabular-nums">
                      {result.classicPotential.score}
                      <span className="text-ink-faint text-xs font-normal">/10</span>
                    </span>
                  </div>
                  {result.classicPotential.reasons?.length > 0 && (
                    <ul className="space-y-2">
                      {result.classicPotential.reasons.map((r, i) => (
                        <li key={i} className="flex gap-2.5 text-xs text-ink-muted leading-relaxed">
                          <span className="text-ember-600 flex-shrink-0">▸</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </div>

            {/* ── SECTION 2: CHARACTER ────────────────────────── */}
            <div id="character" ref={characterTileRef} className="scroll-mt-4 space-y-4">
              <TileHeader index="02" label="Character" score={characterScore} quip={getQuip("character", characterScore)} />

              {/* Why Enthusiasts Care */}
              {result.whyEnthusiastsCare && (
                <Card className="p-6">
                  <SectionLabel>Why Enthusiasts Care</SectionLabel>
                  <p className="text-ink/85 text-sm leading-relaxed">{result.whyEnthusiastsCare}</p>
                </Card>
              )}

              {/* Driving Character */}
              {result.drivingCharacter && (
                <Card className="p-6">
                  <SectionLabel>Driving Character</SectionLabel>
                  <div className="space-y-0">
                    <DriveScoreRow metric={result.drivingCharacter.steeringFeel} label="Steering" />
                    <DriveScoreRow metric={result.drivingCharacter.engineCharacter} label="Engine" />
                    <DriveScoreRow metric={result.drivingCharacter.dailyComfort} label="Daily" />
                    <DriveScoreRow metric={result.drivingCharacter.overallFun} label="Fun" />
                  </div>
                  {result.drivingCharacter.summary && (
                    <p className="text-ink-muted text-xs italic leading-relaxed border-t border-line pt-4 mt-1">
                      {result.drivingCharacter.summary}
                    </p>
                  )}
                </Card>
              )}

              {/* Mod Potential */}
              {result.modPotential && <ModPotentialCard data={result.modPotential} />}
            </div>

            {/* ── SECTION 3: STREET CRED ──────────────────────── */}
            <div id="street-cred" ref={investmentTileRef} className="scroll-mt-4 space-y-4">
              <TileHeader index="03" label="Street Cred" score={result.vibeScore ?? null} />

              {/* Owner Vibe */}
              {result.ownerVibe?.label && (
                <div ref={ownerVibeRef} className="scroll-mt-4">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <SectionLabel>Owner Vibe</SectionLabel>
                      <VerdictBadge verdict={result.ownerVibe.label} />
                    </div>
                    {result.ownerVibe.reasoning && (
                      <p className="text-ink-muted text-sm leading-relaxed">{result.ownerVibe.reasoning}</p>
                    )}
                  </Card>
                </div>
              )}

              {/* Cars & Coffee + Community Credibility */}
              {(result.carsCoffee || result.communityCredibility) && (
                <Card className="p-6 space-y-5">
                  {result.carsCoffee && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>Cars &amp; Coffee</SectionLabel>
                        <RatingBadge rating={result.carsCoffee.rating} />
                      </div>
                      <p className="text-ink-muted text-sm leading-relaxed">{result.carsCoffee.description}</p>
                    </div>
                  )}
                  {result.carsCoffee && result.communityCredibility && (
                    <div className="h-px bg-line" />
                  )}
                  {result.communityCredibility && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>Community Credibility</SectionLabel>
                        <RatingBadge rating={result.communityCredibility.rating} />
                      </div>
                      <p className="text-ink-muted text-sm leading-relaxed">{result.communityCredibility.description}</p>
                    </div>
                  )}
                  {result.socialStanding && (
                    <>
                      <div className="h-px bg-line" />
                      <p className="text-ink-muted text-sm italic leading-relaxed pl-3.5 border-l-2 border-ember-500/60">
                        {result.socialStanding}
                      </p>
                    </>
                  )}
                </Card>
              )}

              {/* Regret Risk */}
              {result.regretRisk && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel>Regret Risk</SectionLabel>
                    <VerdictBadge verdict={result.regretRisk.level} />
                  </div>
                  <p className="text-ink-muted text-sm leading-relaxed">{result.regretRisk.reason}</p>
                </Card>
              )}
            </div>

            {/* ── SPEC SIGNIFICANCE ───────────────────────────── */}
            {result.specSignificance?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 pt-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Spec Significance</span>
                  <div className="flex-1 h-px bg-line" />
                </div>
                <Card className="p-6">
                  <ul className="space-y-3.5">
                    {result.specSignificance.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-ember-400 flex-shrink-0 font-bold mt-0.5">+</span>
                        <div>
                          <span className="font-bold text-ink text-sm">{s.item}</span>
                          {s.note && <p className="text-ink-faint text-xs mt-1 leading-relaxed">{s.note}</p>}
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
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Ask the Seller</span>
                  <div className="flex-1 h-px bg-line" />
                </div>
                <Card className="p-6">
                  <ol className="space-y-3.5">
                    {result.questionsToAsk.map((q, i) => (
                      <li key={i} className="flex gap-3.5 text-sm border-b border-line pb-3.5 last:border-0 last:pb-0">
                        <span className="font-mono text-ember-500 font-bold w-5 flex-shrink-0 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                        <span className="text-ink/85 leading-snug">{q}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            )}

            {/* ── YOU MIGHT ALSO CONSIDER ─────────────────────── */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 pt-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">You Might Also Consider</span>
                  <div className="flex-1 h-px bg-line" />
                </div>
                <Card className="p-6 space-y-5">
                  {result.alternatives.map((alt, i) => (
                    <div key={i} className={i > 0 ? "pt-5 border-t border-line" : ""}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-bold text-ink text-sm leading-snug">{alt.name}</p>
                        {alt.priceRange && (
                          <span className="flex-shrink-0 font-mono text-[10px] font-medium text-ink-muted bg-white/[0.04] border border-line px-2.5 py-1 rounded whitespace-nowrap tabular-nums">
                            {alt.priceRange}
                          </span>
                        )}
                      </div>
                      <p className="text-ink-muted text-sm leading-relaxed">{alt.whySuited}</p>
                      <p className="text-ink-faint text-xs leading-relaxed mt-1.5">{alt.howDiffers}</p>
                    </div>
                  ))}
                  <p className="font-mono text-ink-faint text-[10px] leading-relaxed pt-3 border-t border-line">
                    These are AI suggestions based on general market knowledge — not live Trade Me listings. Availability and pricing may vary.
                  </p>
                </Card>
              </div>
            )}

            {/* ── THE ENTHUSIAST TAKE ─────────────────────────── */}
            {result.enthusiastTake && (
              <div className="rounded-xl bg-carbon-900 border border-line-strong overflow-hidden">
                <div className="bg-ember-500 px-5 py-3 flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-carbon-950/50" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-carbon-950">
                    The Enthusiast Take
                  </span>
                </div>
                <div className="px-6 py-5">
                  <p className="text-ink leading-relaxed text-[15px]">{result.enthusiastTake}</p>
                </div>
              </div>
            )}

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

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
