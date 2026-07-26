"use client";

import { useState, useEffect } from "react";

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

export function WheelSpinner() {
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
