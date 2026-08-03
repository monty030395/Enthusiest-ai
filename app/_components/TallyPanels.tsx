// Presentational halves of a comparison, shared by the interactive Garage
// view and the read-only public /c/<id> page. No hooks, no state — whatever
// renders these decides where the data came from.
import { type Analysis } from "../_lib/analysis";
import { type Tally, type HeadToHead, tallyQuip } from "../_lib/compare";
import { V_RED, verdictBadgeStyle, RoastBadge } from "./badges";
import { Card } from "./ui";

function CarHeader({ analysis }: { analysis: Analysis }) {
  const v = analysis.vehicle;
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint">{v.year}</p>
      <h3 className="font-display text-lg font-extrabold text-ink tracking-tight leading-tight">
        {v.make} {v.model}
      </h3>
      {v.price && (
        <p className="font-mono text-ember-400 text-sm font-bold tabular-nums">{v.price}</p>
      )}
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
    `text-xs leading-snug ${won ? "text-emerald-400 font-bold" : lost ? "text-ink-faint" : "text-ink-muted"}`;

  return (
    <>
      {/* Car headers */}
      <Card className="overflow-hidden">
        <div className="h-px bg-gradient-to-r from-ember-500 via-ember-500/40 to-transparent" />
        <div className="p-5 grid grid-cols-2 gap-4">
          <CarHeader analysis={a} />
          <CarHeader analysis={b} />
        </div>
      </Card>

      {/* Tally table */}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {tally.rows.map((row) => (
            <li key={row.label} className="px-5 py-3">
              <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint mb-1.5 flex items-center gap-1.5">
                {row.label}
                {row.winner === 0 && !row.exact && (
                  <span className="normal-case tracking-normal text-ink-faint/60">· too close to call</span>
                )}
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
    </>
  );
}

export function HeadToHeadCard({ a, b, h2h }: { a: Analysis; b: Analysis; h2h: HeadToHead }) {
  const winner = h2h.winner === "a" ? a : b;
  const winnerName = `${winner.vehicle.make} ${winner.vehicle.model}`;

  const col = (side: "a" | "b", analysis: Analysis) => (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint">
          Case for the {analysis.vehicle.model}
        </p>
        {h2h.winner === side && (
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-400 border border-emerald-400/40 bg-emerald-400/10 rounded px-1.5 py-0.5">
            Winner
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {h2h.caseFor?.[side]?.map((point, i) => (
          <li key={i} className="flex gap-2 text-xs text-ink-muted leading-relaxed">
            <span className="text-ember-400 flex-shrink-0 font-bold">+</span>
            {point}
          </li>
        ))}
      </ul>
      {h2h.dealBreaker?.[side] && (
        <div className="pl-2.5 border-l-2" style={{ borderColor: V_RED.border }}>
          <p className="font-mono text-[8px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Deal-breaker</p>
          <p className="text-xs leading-relaxed" style={{ color: V_RED.text }}>{h2h.dealBreaker[side]}</p>
        </div>
      )}
    </div>
  );

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
}
