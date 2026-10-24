"use client";

import { useState, useEffect, type ReactNode } from "react";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-3">{children}</p>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-white/[0.02] ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded border border-line bg-white/[0.04] text-ink-muted font-mono text-[11px]">
      {children}
    </span>
  );
}

// Roast Mode's switch, behind a flip-up guard like an ignition-kill or nitrous
// switch: the guard is down while it's off and lifts when it's armed, so the
// state reads from across the room. Still a plain role="switch" button.
export function GuardedSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3.5 group text-left"
    >
      <span className="relative w-11 h-14 flex-none [perspective:220px]" aria-hidden="true">
        <span className="absolute inset-x-2 inset-y-2 rounded-md bg-carbon-900 ring-1 ring-line-strong" />
        <span
          className={`absolute left-1/2 top-1/2 -ml-1 w-2 h-5 rounded-full bg-gradient-to-b from-glow-300 to-carbon-600 origin-bottom transition-transform duration-300 ${checked ? "-translate-y-full" : "-translate-y-full rotate-180"}`}
        />
        <span
          className={`absolute inset-x-0.5 top-0.5 h-10 rounded-t-lg rounded-b-sm bg-needle/50 ring-2 ring-needle/80 origin-top transition-transform duration-300 ${checked ? "[transform:rotateX(78deg)]" : "[transform:rotateX(0deg)]"}`}
        />
        <span className={`absolute bottom-0 left-1/2 -ml-1 w-2 h-2 rounded-full transition-colors ${checked ? "bg-needle shadow-[0_0_8px_var(--color-needle)]" : "bg-carbon-700"}`} />
      </span>
      <span className="grid gap-0.5">
        <span className="font-display text-sm font-semibold text-ink">{label}</span>
        <span className={`font-mono text-[11px] uppercase tracking-[0.12em] ${checked ? "text-needle" : "text-ink-faint"}`}>
          {checked ? "Armed" : "Off — tap to lift the guard"}
        </span>
      </span>
    </button>
  );
}

// The one big control on the analyser: a push-to-start button. Round, ringed
// in needle red when it can fire, dimmed when there's nothing to check yet.
// A running check disables it but keeps it lit, like an engine that's on.
export function StartButton({ onClick, disabled, busy, label }: { onClick: () => void; disabled?: boolean; busy?: boolean; label?: ReactNode }) {
  const lit = !disabled || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex-none w-24 h-24 rounded-full grid place-items-center text-center bg-[radial-gradient(circle_at_50%_35%,var(--color-carbon-700),var(--color-carbon-950)_75%)] shadow-[0_0_0_4px_var(--color-carbon-950),0_0_0_6px_var(--color-carbon-600),0_6px_16px_rgba(0,0,0,0.5)] enabled:hover:shadow-[0_0_0_4px_var(--color-carbon-950),0_0_0_6px_var(--color-glow-600),0_0_18px_rgba(169,216,255,0.25)] enabled:active:scale-[0.97] transition-[transform,box-shadow] disabled:cursor-not-allowed focus-visible:outline-offset-8"
    >
      <span className="grid justify-items-center gap-1">
        <span
          className={`block w-3.5 h-3.5 rounded-full border-2 border-t-transparent ${lit ? "border-needle" : "border-carbon-600"} ${busy ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        <span className={`font-display text-[11px] font-bold uppercase tracking-[0.1em] leading-tight ${lit ? "text-ink" : "text-ink-faint"}`}>
          {busy ? <>Checking</> : label ?? <>Start<br />check</>}
        </span>
      </span>
    </button>
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

export function RotatingMessage() {
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

// Loading: a tacho revving up and settling back while the check runs.
// The needle's motion lives in globals.css (tacho-rev) so reduced motion
// can park it at rest.
const TACHO_TICKS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function Tacho() {
  const cx = 100, cy = 100, r = 82;
  const at = (radius: number, i: number) => {
    const a = Math.PI + (Math.PI * i) / 8;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };
  const [rx0, ry0] = at(r - 3, 6.5);
  const [rx1, ry1] = at(r - 3, 8);
  return (
    <svg className="w-48 h-auto" viewBox="0 0 200 118" fill="none" aria-hidden="true">
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} className="stroke-carbon-700" strokeWidth="4" />
      <path d={`M${rx0} ${ry0} A${r - 3} ${r - 3} 0 0 1 ${rx1} ${ry1}`} className="stroke-needle" strokeWidth="4" opacity="0.85" />
      {TACHO_TICKS.map((i) => {
        const [x0, y0] = at(r - 6, i);
        const [x1, y1] = at(r - 16, i);
        const [tx, ty] = at(r - 28, i);
        return (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} className="stroke-glow-400" strokeWidth="2" />
            <text x={tx} y={ty + 4} textAnchor="middle" className="fill-glow-400 font-display" fontSize="12" fontWeight="600">{i}</text>
          </g>
        );
      })}
      <text x={cx} y={cy - 20} textAnchor="middle" className="fill-ink-faint font-display" fontSize="8" letterSpacing="1">×1000 RPM</text>
      <g className="tacho-needle">
        <line x1={cx + 10} y1={cy} x2={cx - (r - 10)} y2={cy} className="stroke-needle" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r="7" className="fill-carbon-800 stroke-needle" strokeWidth="1.5" />
    </svg>
  );
}
