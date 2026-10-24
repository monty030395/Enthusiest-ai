// Presentational halves of a comparison, shared by the interactive Garage
// view and the read-only public /c/<id> page. No hooks, no state — whatever
// renders these decides where the data came from.
import type { ReactNode } from "react";
import { type Analysis, computeCharacterScore } from "../_lib/analysis";
import { type Tally, type HeadToHead, tallyQuip } from "../_lib/compare";
import { V_GREEN, V_RED, verdictBadgeStyle, RoastBadge } from "./badges";
import { Card } from "./ui";
import { MiniDial, LcdNumber, IndicatorLamp } from "./gauges";

// Section header strip, lit like a backlit panel legend
function PanelLegend({ children }: { children: ReactNode }) {
  return (
    <div className="bg-dial border-b border-line px-5 py-3">
      <span className="font-display text-sm font-bold text-glow-300 [text-shadow:0_0_8px_rgba(169,216,255,0.45)]">{children}</span>
    </div>
  );
}

function CarHeader({ analysis, mirror = false }: { analysis: Analysis; mirror?: boolean }) {
  const v = analysis.vehicle;
  return (
    <div className={`min-w-0 space-y-1.5 ${mirror ? "text-right" : ""}`}>
      <p className="font-mono text-xs text-ink-faint">{v.year}</p>
      <h3 className="font-display text-base font-bold text-ink tracking-tight leading-tight [overflow-wrap:anywhere]">
        {v.make} {v.model}
      </h3>
      {v.price && (
        <p className="font-mono text-glow-300 text-sm tabular-nums [text-shadow:0_0_6px_rgba(169,216,255,0.45)]">{v.price}</p>
      )}
      {analysis.label && (
        <div className={`pt-0.5 flex flex-wrap items-center gap-1.5 ${mirror ? "justify-end" : ""}`}>
          <span style={{ ...verdictBadgeStyle(analysis.label), whiteSpace: "normal" as const }}>{analysis.label}</span>
          {analysis.mode === "roast" && <RoastBadge />}
        </div>
      )}
    </div>
  );
}

// The three dash scores, drawn as two clusters facing each other: car A's
// dials on the left, car B's on the right, the lamp lit beside the winner
const SCORE_ROWS: Record<string, { short: string; score: (a: Analysis) => number | null }> = {
  Investment: { short: "Invest", score: (a) => a.investmentScore ?? null },
  Character: { short: "Character", score: (a) => computeCharacterScore(a) },
  "Street Cred": { short: "Cred", score: (a) => a.vibeScore ?? null },
};

export function TallyBoard({ a, b, tally }: { a: Analysis; b: Analysis; tally: Tally }) {
  const aName = `${a.vehicle.make} ${a.vehicle.model}`;
  const bName = `${b.vehicle.make} ${b.vehicle.model}`;
  // The count sits either side of this line, so it names the winner
  // without repeating the score
  const verdictLine =
    tally.aWins === tally.bWins
      ? "All square."
      : `${tally.aWins > tally.bWins ? aName : bName} takes it.`;

  const scoreRows = tally.rows.filter((r) => r.label in SCORE_ROWS);
  // A row neither car has anything for is only a pair of dashes
  const otherRows = tally.rows.filter(
    (r) => !(r.label in SCORE_ROWS) && !(r.aDisplay === "—" && r.bDisplay === "—")
  );

  const cell = (won: boolean, lost: boolean) =>
    `flex items-baseline gap-1.5 text-xs leading-snug ${won ? "text-ink font-bold" : lost ? "text-ink-faint" : "text-ink-muted"}`;

  return (
    <>
      {/* The two cars face off: headers side by side, then their clusters */}
      <Card className="overflow-hidden">
        <div className="p-4 grid grid-cols-[1fr_auto_1fr] gap-3">
          <CarHeader analysis={a} />
          <span className="self-start mt-6 font-display text-xs font-bold text-ink-faint" aria-hidden="true">VS</span>
          <CarHeader analysis={b} mirror />
        </div>
        <ul className="bg-dial border-t border-line px-3 py-2.5 space-y-1.5">
          {scoreRows.map((row) => {
            const def = SCORE_ROWS[row.label];
            return (
              <li key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className="flex items-center justify-end gap-2">
                  <IndicatorLamp on={row.winner === 1} />
                  <MiniDial score={def.score(a)} label={`${aName} ${row.label}`} caption={false} />
                </span>
                <span className="w-20 text-center leading-tight">
                  <span className="block font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">{def.short}</span>
                  {row.winner === 0 && !row.exact && (
                    <span className="block text-xs text-ink-faint/70">too close</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <MiniDial score={def.score(b)} label={`${bName} ${row.label}`} caption={false} />
                  <IndicatorLamp on={row.winner === 2} />
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Tally table — the scores above are rows too; they count in "Rows won" */}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {otherRows.map((row) => (
            <li key={row.label} className="px-5 py-3">
              <p className="font-display text-xs font-semibold text-ink-faint mb-1.5 flex items-center justify-center gap-1.5">
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
                <p className={`${cell(row.winner === 2, row.winner === 1)} justify-end text-right`}>
                  {row.bDisplay}
                  <IndicatorLamp on={row.winner === 2} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* The tally: rows won either side of the call */}
      <div className="rounded-xl bg-dial/60 ring-1 ring-line overflow-hidden">
        <PanelLegend>The tally: rows won</PanelLegend>
        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <LcdNumber value={tally.aWins} lit={tally.aWins >= tally.bWins} />
            <div className="text-center min-w-0">
              <p className="text-ink leading-snug text-[15px] font-medium [overflow-wrap:anywhere]">{verdictLine}</p>
              <p className="text-ink-muted text-sm italic mt-1">{tallyQuip(tally.aWins, tally.bWins)}</p>
            </div>
            <LcdNumber value={tally.bWins} lit={tally.bWins >= tally.aWins} />
          </div>
          {/* How a row is won, where the count is read */}
          <p className="text-xs text-ink-faint leading-relaxed text-center border-t border-line pt-3">
            Scores count when the cars are 2+ points apart; flags and ratings on any difference. Price is shown, never scored.
          </p>
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
    <div className="rounded-xl bg-dial/60 ring-1 ring-line overflow-hidden">
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
