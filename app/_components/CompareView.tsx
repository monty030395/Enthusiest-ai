"use client";

import { useState } from "react";
import { type SavedCheck } from "../_lib/garage";
import { tallyUp, tallyQuip, fetchHeadToHead, type HeadToHead } from "../_lib/compare";
import { V_RED, verdictBadgeStyle } from "./badges";
import { Card, WheelSpinner } from "./ui";

// One head-to-head per pair per session — don't re-spend the API call when
// the user bounces between list and compare
const h2hCache = new Map<string, HeadToHead>();

function CarHeader({ check }: { check: SavedCheck }) {
  const v = check.analysis.vehicle;
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint">{v.year}</p>
      <h3 className="font-display text-lg font-extrabold text-ink tracking-tight leading-tight">
        {v.make} {v.model}
      </h3>
      {v.price && (
        <p className="font-mono text-ember-400 text-sm font-bold tabular-nums">{v.price}</p>
      )}
      {check.analysis.label && (
        <div className="pt-0.5">
          <span style={{ ...verdictBadgeStyle(check.analysis.label), whiteSpace: "normal" as const }}>{check.analysis.label}</span>
        </div>
      )}
    </div>
  );
}

// Side-by-side tally of two saved checks. Pure client-side — no API call.
export default function CompareView({ a, b, onBack }: { a: SavedCheck; b: SavedCheck; onBack: () => void }) {
  const cacheKey = `${a.id}::${b.id}`;
  const [h2h, setH2h] = useState<HeadToHead | null>(() => h2hCache.get(cacheKey) ?? null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [h2hError, setH2hError] = useState("");

  async function settleIt() {
    setH2hError("");
    setH2hLoading(true);
    try {
      const result = await fetchHeadToHead(a.analysis, b.analysis);
      h2hCache.set(cacheKey, result);
      setH2h(result);
    } catch (err) {
      setH2hError(err instanceof Error ? err.message : "The head-to-head fell over — give it another go.");
    } finally {
      setH2hLoading(false);
    }
  }

  const tally = tallyUp(a.analysis, b.analysis);
  const aName = `${a.analysis.vehicle.make} ${a.analysis.vehicle.model}`;
  const bName = `${b.analysis.vehicle.make} ${b.analysis.vehicle.model}`;
  const verdictLine =
    tally.aWins === tally.bWins
      ? `${tally.aWins}–${tally.bWins}.`
      : tally.aWins > tally.bWins
        ? `${aName} takes it ${tally.aWins}–${tally.bWins}.`
        : `${bName} takes it ${tally.bWins}–${tally.aWins}.`;

  const cell = (won: boolean, lost: boolean) =>
    `text-xs leading-snug ${won ? "text-emerald-400 font-bold" : lost ? "text-ink-faint" : "text-ink-muted"}`;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint hover:text-ink-muted transition-colors py-2 flex items-center gap-2"
      >
        <span className="text-ember-400">←</span> Back to Garage
      </button>

      <div className="pt-1">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ember-400 mb-3">
          Head to head
        </p>
        <h2 className="font-display text-4xl font-extrabold text-ink leading-[1.05] tracking-tight">
          The Tally Up
        </h2>
      </div>

      {/* Car headers */}
      <Card className="overflow-hidden">
        <div className="h-px bg-gradient-to-r from-ember-500 via-ember-500/40 to-transparent" />
        <div className="p-5 grid grid-cols-2 gap-4">
          <CarHeader check={a} />
          <CarHeader check={b} />
        </div>
      </Card>

      {/* Tally table */}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {tally.rows.map((row) => (
            <li key={row.label} className="px-5 py-3">
              <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint mb-1.5">
                {row.label}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <p className={cell(row.winner === 1, row.winner === 2)}>
                  {row.winner === 1 && <span className="text-emerald-400 mr-1.5">●</span>}
                  {row.aDisplay}
                </p>
                <p className={cell(row.winner === 2, row.winner === 1)}>
                  {row.winner === 2 && <span className="text-emerald-400 mr-1.5">●</span>}
                  {row.bDisplay}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {/* Totals */}
        <div className="border-t border-line-strong px-5 py-4 bg-white/[0.02]">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint mb-1.5">
            Rows won
          </p>
          <div className="grid grid-cols-2 gap-4">
            <p className={`font-mono text-2xl font-bold tabular-nums ${tally.aWins >= tally.bWins ? "text-emerald-400" : "text-ink-faint"}`}>
              {tally.aWins}
            </p>
            <p className={`font-mono text-2xl font-bold tabular-nums ${tally.bWins >= tally.aWins ? "text-emerald-400" : "text-ink-faint"}`}>
              {tally.bWins}
            </p>
          </div>
        </div>
      </Card>

      {/* Verdict bar */}
      <div className="rounded-xl bg-carbon-900 border border-line-strong overflow-hidden">
        <div className="bg-ember-500 px-5 py-3 flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-carbon-950/50" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-carbon-950">
            The Tally
          </span>
        </div>
        <div className="px-6 py-5 space-y-1">
          <p className="text-ink leading-relaxed text-[15px] font-medium">{verdictLine}</p>
          <p className="text-ink-muted text-sm italic">{tallyQuip(tally.aWins, tally.bWins)}</p>
        </div>
      </div>

      {/* ── SETTLE IT: AI head-to-head ──────────────────── */}
      {!h2h && !h2hLoading && (
        <Card className="p-6 space-y-4">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-2">Still arguing?</p>
            <p className="text-ink-muted text-sm leading-relaxed">
              The tally counts rows. The head-to-head has opinions — the strongest case for each car, the deal-breakers, and a straight call on where the money goes.
            </p>
          </div>
          {h2hError && (
            <div className="flex gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: V_RED.bg, border: `1px solid ${V_RED.border}` }}>
              <span className="flex-shrink-0 font-bold" style={{ color: V_RED.text }}>!</span>
              <p className="text-sm leading-relaxed" style={{ color: V_RED.text }}>{h2hError}</p>
            </div>
          )}
          <button
            onClick={settleIt}
            className="w-full bg-ember-500 hover:bg-ember-400 active:bg-ember-600 text-carbon-950 font-mono font-bold uppercase tracking-[0.22em] rounded-lg py-4 transition-all text-xs"
          >
            Settle It — Head-to-Head
          </button>
        </Card>
      )}

      {h2hLoading && (
        <Card className="p-10 flex flex-col items-center gap-5">
          <WheelSpinner />
          <p className="font-display text-ink font-bold text-sm uppercase tracking-[0.12em]">Settling the Argument</p>
          <p className="font-mono text-ink-muted text-xs -mt-3">Steel-manning both sides...</p>
        </Card>
      )}

      {h2h && (() => {
        const winnerCheck = h2h.winner === "a" ? a : b;
        const winnerName = `${winnerCheck.analysis.vehicle.make} ${winnerCheck.analysis.vehicle.model}`;
        const col = (side: "a" | "b", check: SavedCheck) => {
          const v = check.analysis.vehicle;
          return (
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint">
                  Case for the {v.model}
                </p>
                {h2h.winner === side && (
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-400 border border-emerald-400/40 bg-emerald-400/10 rounded px-1.5 py-0.5">
                    Winner
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {h2h.caseFor[side]?.map((point, i) => (
                  <li key={i} className="flex gap-2 text-xs text-ink-muted leading-relaxed">
                    <span className="text-ember-400 flex-shrink-0 font-bold">+</span>
                    {point}
                  </li>
                ))}
              </ul>
              {h2h.dealBreaker[side] && (
                <div className="pl-2.5 border-l-2" style={{ borderColor: V_RED.border }}>
                  <p className="font-mono text-[8px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Deal-breaker</p>
                  <p className="text-xs leading-relaxed" style={{ color: V_RED.text }}>{h2h.dealBreaker[side]}</p>
                </div>
              )}
            </div>
          );
        };
        return (
          <div className="rounded-xl bg-carbon-900 border border-line-strong overflow-hidden">
            <div className="bg-ember-500 px-5 py-3 flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-carbon-950/50" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-carbon-950">
                The Head-to-Head
              </span>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <h3 className="font-display text-2xl font-extrabold text-ink tracking-tight leading-tight">{winnerName}</h3>
                <p className="text-ink-muted text-sm italic mt-1">{h2h.tagline}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1 border-t border-line">
                <div className="pt-4">{col("a", a)}</div>
                <div className="pt-0 sm:pt-4">{col("b", b)}</div>
              </div>
              <div className="pl-4 border-l-2 border-ember-400">
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint mb-1.5">If it were my money</p>
                <p className="text-ink text-sm leading-relaxed">{h2h.myMoney}</p>
              </div>
              {h2h.curveball && (
                <p className="font-mono text-[11px] text-ink-faint leading-relaxed pt-3 border-t border-line">
                  <span className="text-ember-400 font-bold">Curveball:</span> {h2h.curveball}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      <p className="font-mono text-ink-faint text-[10px] leading-relaxed text-center">
        Row wins only count where both checks have the data. Asking price is shown but never scored — cheaper isn&apos;t better, it&apos;s just cheaper.
      </p>
    </div>
  );
}
