"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";

// The results screen's instrument panel: dials for scores, half-moon gauges
// for temperature and fuel, an amber multi-function display, warning lamps
// and an odometer. All drawn as SVG on the Night dash tokens. Needles get
// their angle from --needle-to and play the ignition sweep in globals.css,
// so reduced motion just shows them at rest.

type Pt = [number, number];
const polar = (cx: number, cy: number, r: number, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// useId's output isn't a valid url(#...) fragment everywhere — strip it down
function useSvgId(prefix: string) {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

function Bloom({ id, amount = 0.8 }: { id: string; amount?: number }) {
  return (
    <defs>
      <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation={amount} result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

const DIAL_START = 135; // bottom-left, sweeping 270° clockwise to bottom-right
const DIAL_SWEEP = 270;

// A 0–10 score dial. Null scores show "?" with the needle parked at zero.
// The cluster prints its labels on the switches underneath, so it turns the
// face label off and lets the reading sit a little lower and larger.
export function Dial({ score, label, big = false, faceLabel = true }: { score: number | null; label: string; big?: boolean; faceLabel?: boolean }) {
  const glow = useSvgId("dial");
  const cx = 50, cy = 50, r = 42;
  const value = score === null ? 0 : Math.max(0, Math.min(10, score));
  const [nx, ny] = polar(cx, cy, r - 5, DIAL_START);
  const [bx, by] = polar(cx, cy, -8, DIAL_START);
  return (
    <svg viewBox="0 0 100 92" className={`w-full h-auto ${score === null ? "opacity-50" : ""}`} aria-hidden="true">
      <Bloom id={glow} />
      <circle cx={cx} cy={cy} r="47" className="fill-dial stroke-carbon-700" strokeWidth="1.5" />
      <path d={arcPath(cx, cy, r - 2, DIAL_START + DIAL_SWEEP * 0.8, DIAL_START + DIAL_SWEEP)} className="stroke-needle" strokeWidth="3" opacity="0.85" fill="none" />
      {Array.from({ length: 11 }, (_, i) => {
        const a = DIAL_START + (DIAL_SWEEP * i) / 10;
        const major = i % 2 === 0;
        const [x0, y0] = polar(cx, cy, r, a);
        const [x1, y1] = polar(cx, cy, r - (major ? 7 : 4), a);
        const [tx, ty] = polar(cx, cy, r - 14, a);
        return (
          <g key={i} filter={`url(#${glow})`}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} className="stroke-glow-300" strokeWidth={major ? 1.6 : 1} opacity={major ? 1 : 0.55} />
            {major && big && i > 0 && i < 10 && (
              <text x={tx} y={ty + 2.6} textAnchor="middle" className="fill-glow-300 font-display" fontSize="7.5" fontWeight="600">{i}</text>
            )}
          </g>
        );
      })}
      <text x={cx} y={cy + (faceLabel ? 24 : 30)} textAnchor="middle" className="fill-ink font-display" fontSize={faceLabel ? (big ? 12 : 13) : (big ? 14 : 16)} fontWeight="700">
        {score === null ? "?" : score}
      </text>
      {faceLabel && (
        <text x={cx} y={cy + 34} textAnchor="middle" className="fill-ink-faint font-display" fontSize={big ? 6.5 : 5.8} fontWeight="600" letterSpacing="0.4">
          {label.toUpperCase()}
        </text>
      )}
      <g
        className="dial-needle"
        style={{ "--needle-to": `${(DIAL_SWEEP * value) / 10}deg`, transformOrigin: `${cx}px ${cy}px` } as CSSProperties}
      >
        <line x1={bx} y1={by} x2={nx} y2={ny} className="stroke-needle" strokeWidth="2.4" strokeLinecap="round" filter={`url(#${glow})`} />
      </g>
      <circle cx={cx} cy={cy} r="5" className="fill-carbon-900 stroke-needle" strokeWidth="1.2" />
    </svg>
  );
}

// `short` is the switch's printed name, so three fit across a phone at 12px
export type ClusterDial = { label: string; short?: string; score: number | null; onClick: () => void };

// Remembers that the switches have had their one-time glow on this device
const SWITCH_HINT_KEY = "motormind.switchHint.v1";

// Investment, Character (the big centre dial), Street Cred. Each column is
// one button: the dial plus a lit dash switch underneath with a ↓, so it
// reads as something to press. The first time anyone sees results, the
// switches glow once after the ignition sweep, like a self-test.
export function Cluster({ dials }: { dials: [ClusterDial, ClusterDial, ClusterDial] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Set on the DOM, not in state, so a server-rendered shared page hydrates
  // without a mismatch
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SWITCH_HINT_KEY)) return;
      window.localStorage.setItem(SWITCH_HINT_KEY, "1");
    } catch {
      return; // storage blocked — skip the hint rather than glow every time
    }
    ref.current?.classList.add("switch-hint");
  }, []);
  return (
    <div ref={ref} className="mx-auto w-full max-w-md grid grid-cols-[1fr_1.35fr_1fr] items-end gap-1 rounded-2xl bg-dial ring-1 ring-line px-2 pt-3 pb-2.5 shadow-[inset_0_10px_24px_rgba(0,0,0,0.6)]">
      {dials.map((d, i) => (
        <button
          key={d.label}
          type="button"
          onClick={d.onClick}
          aria-label={`${d.label}: ${d.score === null ? "not scored" : `${d.score} out of 10`}. Jump to section.`}
          className="group grid justify-items-center gap-1.5 rounded-xl focus-visible:outline-offset-0"
        >
          <span className="w-full transition-transform group-active:scale-95">
            <Dial score={d.score} label={d.label} big={i === 1} faceLabel={false} />
          </span>
          <span
            className="dash-switch inline-flex items-center gap-1 rounded-md bg-carbon-850 ring-1 ring-line-strong px-2 py-1 font-display text-xs font-semibold uppercase tracking-[0.06em] text-glow-400 whitespace-nowrap shadow-[0_2px_0_var(--color-carbon-950),inset_0_1px_0_rgba(255,255,255,0.06)] [text-shadow:0_0_6px_rgba(169,216,255,0.45)] transition-all group-hover:text-glow-300 group-hover:ring-glow-600/60 group-active:translate-y-[2px] group-active:shadow-none"
            aria-hidden="true"
          >
            {d.short ?? d.label}
            <span className="leading-none opacity-80">↓</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// A thumbnail dial for lists and comparisons: the reading is a lit arc plus
// the number, since tick marks at this size are just noise.
export function MiniDial({ score, label }: { score: number | null; label: string }) {
  const cx = 20, cy = 20, r = 15;
  const value = score === null ? 0 : Math.max(0, Math.min(10, score));
  const end = DIAL_START + (DIAL_SWEEP * value) / 10;
  const [nx, ny] = polar(cx, cy, r - 3, DIAL_START);
  return (
    <span className="flex flex-col items-center gap-0.5" role="img" aria-label={`${label}: ${score === null ? "not scored" : `${score} out of 10`}`}>
      <svg viewBox="0 0 40 36" className="w-11 h-auto" aria-hidden="true">
        <circle cx={cx} cy={cy} r="19" className="fill-dial stroke-carbon-700" strokeWidth="1" />
        <path d={arcPath(cx, cy, r, DIAL_START, DIAL_START + DIAL_SWEEP)} className="stroke-carbon-700" strokeWidth="2.5" fill="none" />
        {value > 0 && (
          <path d={arcPath(cx, cy, r, DIAL_START, end)} className="stroke-glow-400" strokeWidth="2.5" fill="none" style={{ filter: "drop-shadow(0 0 2px var(--color-glow-400))" }} />
        )}
        <g
          className="dial-needle"
          style={{ "--needle-to": `${(DIAL_SWEEP * value) / 10}deg`, transformOrigin: `${cx}px ${cy}px` } as CSSProperties}
        >
          <line x1={cx} y1={cy} x2={nx} y2={ny} className="stroke-needle" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-ink font-display" fontSize="9" fontWeight="700">
          {score === null ? "?" : score}
        </text>
      </svg>
      <span className="font-display text-xs font-semibold text-ink-faint leading-none whitespace-nowrap">{label}</span>
    </span>
  );
}

// Three mini dials in a row, in the same order as the results cluster
export function MiniCluster({ investment, character, cred }: { investment: number | null; character: number | null; cred: number | null }) {
  return (
    <span className="inline-flex gap-1.5 rounded-xl bg-dial ring-1 ring-line px-2 pt-1.5 pb-1.5">
      <MiniDial label="Invest" score={investment} />
      <MiniDial label="Character" score={character} />
      <MiniDial label="Cred" score={cred} />
    </span>
  );
}

// An LCD digit readout for a single count, lit or dimmed
export function LcdNumber({ value, lit }: { value: number; lit: boolean }) {
  return (
    <span
      className={`inline-block min-w-[2.5ch] rounded-md bg-dial ring-1 ring-line px-2.5 py-1 text-center font-mono text-2xl tabular-nums shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)] ${
        lit ? "text-glow-300 [text-shadow:0_0_8px_rgba(169,216,255,0.6)]" : "text-ink-faint/60"
      }`}
    >
      {value}
    </span>
  );
}

// A small round indicator lamp — green when the row goes this car's way
export function IndicatorLamp({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block flex-none w-2 h-2 rounded-full ${on ? "bg-[#5fe0a8] shadow-[0_0_6px_#5fe0a8]" : "bg-carbon-700"}`}
    />
  );
}

// Temperature / fuel style gauge: a 100° arc across the top. `level` is 0–1
// from the left mark; the red zone sits on whichever end is bad.
export function HalfGauge({ level, left, right, danger }: { level: number; left: string; right: string; danger: "left" | "right" }) {
  const glow = useSvgId("half");
  const cx = 60, cy = 58, r = 44, a0 = 220, a1 = 320;
  const span = a1 - a0;
  const clamped = Math.max(0, Math.min(1, level));
  const [dz0, dz1] = danger === "right" ? [a0 + span * 0.78, a1] : [a0, a0 + span * 0.22];
  const [lx, ly] = polar(cx, cy, r + 2, a0);
  const [rx, ry] = polar(cx, cy, r + 2, a1);
  const [nx, ny] = polar(cx, cy, r - 2, a0);
  const [bx, by] = polar(cx, cy, 20, a0);
  return (
    <svg viewBox="0 4 120 52" className="w-full max-w-[220px] h-auto" aria-hidden="true">
      <Bloom id={glow} />
      <path d={arcPath(cx, cy, r, a0, a1)} className="stroke-carbon-700" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d={arcPath(cx, cy, r, dz0, dz1)} className="stroke-needle" strokeWidth="5" strokeLinecap="round" fill="none" />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = a0 + (span * i) / 4;
        const [x0, y0] = polar(cx, cy, r - 6, a);
        const [x1, y1] = polar(cx, cy, r - 11, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="stroke-glow-300" strokeWidth="1.4" filter={`url(#${glow})`} />;
      })}
      <text x={lx - 4} y={ly + 12} textAnchor="middle" className="fill-glow-300 font-display" fontSize="10" fontWeight="700" filter={`url(#${glow})`}>{left}</text>
      <text x={rx + 4} y={ry + 12} textAnchor="middle" className="fill-glow-300 font-display" fontSize="10" fontWeight="700" filter={`url(#${glow})`}>{right}</text>
      <g
        className="dial-needle"
        style={{ "--needle-to": `${span * clamped}deg`, "--needle-max": `${span}deg`, transformOrigin: `${cx}px ${cy}px` } as CSSProperties}
      >
        <line x1={bx} y1={by} x2={nx} y2={ny} className="stroke-needle" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Amber multi-function display, GT-R style: one bar graph per drive score,
// top two segments in needle red like a redline.
export function MultiFunctionDisplay({ rows }: { rows: { label: string; score: number }[] }) {
  return (
    <div className="rounded-lg bg-dial px-3.5 py-3 ring-1 ring-line shadow-[0_0_0_4px_var(--color-carbon-900)] font-mono text-mfd grid gap-2">
      {rows.map((row) => {
        const lit = Math.max(0, Math.min(10, Math.round(row.score)));
        return (
          <div key={row.label} className="grid grid-cols-[4.5rem_1fr_1.25rem] items-center gap-2.5 text-xs">
            <span className="uppercase tracking-[0.08em]">{row.label}</span>
            <span className="grid grid-cols-10 gap-[2px]" role="img" aria-label={`${row.label} ${row.score} out of 10`}>
              {Array.from({ length: 10 }, (_, i) => (
                <i
                  key={i}
                  className={`h-2.5 ${
                    i >= lit ? "bg-carbon-800"
                    : i >= 8 ? "bg-needle shadow-[0_0_5px_var(--color-needle)]"
                    : "bg-mfd shadow-[0_0_5px_rgba(255,173,59,0.55)]"
                  }`}
                />
              ))}
            </span>
            <span className="text-right tabular-nums">{row.score}</span>
          </div>
        );
      })}
    </div>
  );
}

// Dashboard telltales. Red flags arrive as free text, so each one is sorted
// into the system its wording points at; anything that fits no lamp (rust,
// paperwork, a dodgy seller) lights the master warning, so every flag shows.
export type LampKind = "engine" | "oil" | "temp" | "battery" | "gearbox" | "master";

const LAMP_ORDER: LampKind[] = ["engine", "oil", "temp", "battery", "gearbox", "master"];

const LAMP_NAME: Record<LampKind, string> = {
  engine: "Engine",
  oil: "Oil",
  temp: "Cooling",
  battery: "Electrical",
  gearbox: "Gearbox",
  master: "General",
};

// Most specific first: "oil leak from the turbo" is an oil lamp, not engine
const LAMP_MATCH: [LampKind, RegExp][] = [
  ["oil", /\boil\b|sump|rear main seal|valve stem seal/i],
  ["temp", /coolant|cooling|overheat|radiator|water pump|thermostat|head gasket/i],
  ["gearbox", /gearbox|transmission|clutch|\bcvt\b|\bdsg\b|differential|\bdiff\b|synchro|auto box/i],
  ["battery", /electric|battery|alternator|wiring|\bfuse/i],
  ["engine", /engine|turbo|timing|misfire|vanos|camshaft|piston|rod knock|compression|boost|injector|ignition|coil pack|rebuil/i],
];

export function lampFor(text: string): LampKind {
  return LAMP_MATCH.find(([, re]) => re.test(text))?.[0] ?? "master";
}

const LAMP_GLYPH: Record<LampKind, ReactNode> = {
  engine: <path d="M5 12h3l2-3h6l1 2h3v2h2v-2h2v7h-2v-2h-2v3h-4l-2 2H9l-2-2H5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  oil: (
    <>
      <path d="M3 13l5-2h6l3 2 6-3-5 7H6l-3-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 11V9h4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M22 14q0 2-1 2" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </>
  ),
  temp: (
    <>
      <path d="M12 4v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 7h3M14 10h3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 21q2-1.5 3.5 0t3.5 0 3.5 0 3.5 0" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  battery: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8V6h3v2M14 8V6h3v2M7 13h3M15 11.5v3M13.5 13h3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </>
  ),
  gearbox: (
    <>
      <circle cx="11" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.6 1.8" />
      <circle cx="11" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M21 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="21" cy="16" r="1" fill="currentColor" />
    </>
  ),
  master: (
    <>
      <path d="M12 3.5 22 20.5H2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17.6" r="1.2" fill="currentColor" />
    </>
  ),
};

export type LampTone = "red" | "amber" | "off";

// One telltale. Off lamps stay visible but dark, as on a real dash.
export function WarningLamp({ kind, tone, size = "md" }: { kind: LampKind; tone: LampTone; size?: "sm" | "md" }) {
  const color = tone === "red" ? "var(--color-needle)" : tone === "amber" ? "var(--color-mfd)" : "var(--color-carbon-700)";
  const lit = tone !== "off";
  return (
    <span
      className={`flex-none grid place-items-center rounded-lg bg-dial ring-1 ring-line ${size === "sm" ? "w-9 h-9" : "w-11 h-11"}`}
      style={{ color, boxShadow: lit ? `0 0 12px color-mix(in srgb, ${color} 35%, transparent)` : undefined }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className={size === "sm" ? "w-6 h-6" : "w-7 h-7"} style={lit ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}>
        {LAMP_GLYPH[kind]}
      </svg>
    </span>
  );
}

// The row of telltales across the panel. A lamp is red if any confirmed flag
// lights it, amber if only "depends on the variant" ones do, else dark.
export function TelltalePanel({ flags, size = "md" }: { flags: { kind: LampKind; conditional: boolean }[]; size?: "sm" | "md" }) {
  const tones = LAMP_ORDER.map((kind) => {
    const hits = flags.filter((f) => f.kind === kind);
    const tone: LampTone = hits.length === 0 ? "off" : hits.some((f) => !f.conditional) ? "red" : "amber";
    return { kind, tone };
  });
  const lit = tones.filter((t) => t.tone !== "off");
  return (
    <div
      className="flex flex-wrap gap-2.5"
      role="img"
      aria-label={lit.length === 0 ? "No warning lamps lit" : `Warning lamps lit: ${lit.map((t) => `${LAMP_NAME[t.kind]} (${t.tone})`).join(", ")}`}
    >
      {tones.map((t) => (
        <WarningLamp key={t.kind} kind={t.kind} tone={t.tone} size={size} />
      ))}
    </div>
  );
}

// Odometer drums. Only for a plain whole-km reading — "155xx kms" or
// "unknown" stays as text, because inventing digits would misread the listing.
export function parseOdometer(mileage: string | undefined): string | null {
  if (!mileage) return null;
  const m = mileage.trim().match(/^([\d,\s.]+)\s*(km|kms|kilometres|kilometers)?$/i);
  if (!m) return null;
  const digits = m[1].replace(/[^\d]/g, "");
  if (!digits || digits.length > 7) return null;
  return digits.padStart(6, "0");
}

export function Odometer({ digits }: { digits: string }) {
  return (
    <span className="inline-flex items-end gap-1.5" role="img" aria-label={`${Number(digits).toLocaleString("en-NZ")} km`}>
      <span className="inline-flex gap-[2px] rounded bg-dial p-[3px] ring-1 ring-line">
        {[...digits].map((d, i) => (
          <span key={i} className="w-[1.1em] text-center font-mono text-base leading-[1.45] rounded-[2px] bg-gradient-to-b from-glow-300 via-white to-glow-300 text-carbon-950">
            {d}
          </span>
        ))}
      </span>
      <span className="font-mono text-xs text-ink-faint pb-0.5">km</span>
    </span>
  );
}
