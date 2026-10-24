// Presentational halves of a comparison, shared by the interactive Garage
// view and the read-only public /c/<id> page. No hooks, no state — whatever
// renders these decides where the data came from.
import type { ReactNode } from "react";
import { type Analysis, computeCharacterScore } from "../_lib/analysis";
import { type Tally, type HeadToHead, tallyQuip } from "../_lib/compare";
import { V_GREEN, V_RED, verdictBadgeStyle, RoastBadge } from "./badges";
import { Card } from "./ui";
import { MiniCluster, LcdNumber, IndicatorLamp } from "./gauges";

// Section header strip, lit like a backlit panel legend
function PanelLegend({ children }: { children: ReactNode }) {
  return (
    <div className="bg-dial border-b border-line px-5 py-3">
      <span className="font-display text-sm font-bold text-glow-300 [text-shadow:0_0_8px_rgba(169,216,255,0.45)]">{children}</span>
    </div>
  );
}

function CarHeader({ analysis }: { analysis: Analysis }) {
  const v = analysis.vehicle;
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="font-mono text-xs text-ink-faint">{v.year}</p>
      <h3 className="font-display text-lg font-bold text-ink tracking-tight leading-tight">
        {v.make} {v.model}
      </h3>
      {v.price && (
        <p className="font-mono text-glow-300 text-sm tabular-nums [text-shadow:0_0_6px_rgba(169,216,255,0.45)]">{v.price}</p>
      )}
      <div className="pt-1">
        <MiniCluster
          investment={analysis.investmentScore ?? null}
          character={computeCharacterScore(analysis)}
          cred={analysis.vibeScore ?? null}
        />
      </div>
      {analysis.label && (
        <div className="pt-0.5 flex flex-wrap items-center gap-1.5">
          <span style={{ ...verdictBadgeStyle(analysis.label), whiteSpace: "normal" as const }}>{analysis.label}</span>
          {analysis.mode === "roast" && <RoastBadge />}
        </div>
      )}
    </div>
  );
}

export function TallyBoard({ a, b, tally }: { a: Analysis; b: Analysis; tally: Tally }) {
  const aName = `${a.vehicle.make} ${a.vehicle.model}`;
  const bName = `${b.vehicle.make} ${b.vehicle.model}`;
  const verdictLine =
    tally.aWins === tally.bWins
      ? `${tally.aWins}–${tally.bWins}.`
      : tally.aWins > tally.bWins
        ? `${aName} takes it ${tally.aWins}–${tally.bWins}.`
        : `${bName} takes it ${tally.bWins}–${tally.aWins}.`;

  const cell = (won: boolean, lost: boolean) =>
    `flex items-baseline gap-1.5 text-xs leading-snug ${won ? "text-ink font-bold" : lost ? "text-ink-faint" : "text-ink-muted"}`;

  return (
    <>
      {/* Car headers */}
      <Card className="overflow-hidden">
        <div className="p-5 grid grid-cols-1 min-[440px]:grid-cols-2 gap-5">
          <CarHeader analysis={a} />
          <CarHeader analysis={b} />
        </div>
      </Card>

      {/* Tally table */}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {tally.rows.map((row) => (
            <li key={row.label} className="px-5 py-3">
              <p className="font-display text-xs font-semibold text-ink-faint mb-1.5 flex items-center gap-1.5">
                {row.label}
                {row.winner === 0 && !row.exact && (
                  <span className="normal-case tracking-normal text-ink-faint/60">· too close to call</span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <p className={cell(row.winner === 1, row.winner === 2)}>
                  <IndicatorLamp on={row.winner === 1} />
                  {row.aDisplay}
                </p>
                <p className={cell(row.winner === 2, row.winner === 1)}>
                  <IndicatorLamp on={row.winner === 2} />
                  {row.bDisplay}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-line-strong px-5 py-4 bg-white/[0.02]">
          <p className="font-display text-xs font-semibold text-ink-faint mb-2">
            Rows won
          </p>
          <div className="grid grid-cols-2 gap-4">
            <span><LcdNumber value={tally.aWins} lit={tally.aWins >= tally.bWins} /></span>
            <span><LcdNumber value={tally.bWins} lit={tally.bWins >= tally.aWins} /></span>
          </div>
        </div>
      </Card>

      {/* Verdict bar */}
      <div className="rounded-xl bg-carbon-900 border border-line-strong overflow-hidden">
        <PanelLegend>The tally</PanelLegend>
        <div className="px-6 py-5 space-y-1">
          <p className="text-ink leading-relaxed text-[15px] font-medium">{verdictLine}</p>
          <p className="text-ink-muted text-sm italic">{tallyQuip(tally.aWins, tally.bWins)}</p>
        </div>
      </div>
    </>
  );
}

export function HeadToHeadCard({ a, b, h2h }: { a: Analysis; b: Analysis; h2h: HeadToHead }) {
  const winner = h2h.winner === "a" ? a : b;
  const winnerName = `${winner.vehicle.make} ${winner.vehicle.model}`;

  const col = (side: "a" | "b", analysis: Analysis) => (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          Case for the {analysis.vehicle.model}
        </p>
        {h2h.winner === side && (
          <span
            className="inline-flex items-center gap-1.5 font-display text-xs font-bold rounded px-1.5 py-0.5"
            style={{ color: V_GREEN.text, backgroundColor: V_GREEN.bg, border: `1px solid ${V_GREEN.border}` }}
          >
            <IndicatorLamp on /> Winner
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {h2h.caseFor?.[side]?.map((point, i) => (
          <li key={i} className="flex gap-2 text-xs text-ink-muted leading-relaxed">
            <span className="text-glow-400 flex-shrink-0 font-bold">+</span>
            {point}
          </li>
        ))}
      </ul>
      {h2h.dealBreaker?.[side] && (
        <div className="pl-2.5 border-l-2" style={{ borderColor: V_RED.border }}>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-faint mb-1">Deal-breaker</p>
          <p className="text-xs leading-relaxed" style={{ color: V_RED.text }}>{h2h.dealBreaker[side]}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-xl bg-carbon-900 border border-line-strong overflow-hidden">
      <PanelLegend>The head-to-head</PanelLegend>
      <div className="px-6 py-5 space-y-5">
        <div>
          <h3 className="font-display text-2xl font-extrabold text-ink tracking-tight leading-tight">{winnerName}</h3>
          <p className="text-ink-muted text-sm italic mt-1">{h2h.tagline}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1 border-t border-line">
          <div className="pt-4">{col("a", a)}</div>
          <div className="pt-0 sm:pt-4">{col("b", b)}</div>
        </div>
        <div className="pl-4 border-l-2 border-glow-400">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-faint mb-1.5">If it were my money</p>
          <p className="text-ink text-sm leading-relaxed">{h2h.myMoney}</p>
        </div>
        {h2h.curveball && (
          <p className="font-mono text-xs text-ink-faint leading-relaxed pt-3 border-t border-line">
            <span className="text-glow-400 font-bold">Curveball:</span> {h2h.curveball}
          </p>
        )}
      </div>
    </div>
  );
}
