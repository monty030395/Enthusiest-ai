// The Tally Up: pure, client-side comparison of two saved checks.
// Winner-per-row semantics: colour tracks sentiment, so "lower" wins on
// cost/pain rows and "higher" wins on score rows. Rows where either side
// has no data score no points for anyone.
import { type Analysis, computeCharacterScore, isSpecified, isConditional } from "./analysis";

function confirmedFlagCount(a: Analysis): number {
  return (a.redFlags ?? []).filter((f) => !isConditional(f)).length;
}

const TAX_RANK: Record<string, number> = {
  "None": 0, "Mild": 1, "Moderate": 2, "High": 3, "Extreme": 4,
};

const WALLET_RANK: Record<string, number> = {
  "Sensible Purchase": 0,
  "Manageable Pain": 1,
  "Emotionally Justified Disaster": 2,
  "Dangerous": 3,
  "Catastrophic Wallet Destruction": 4,
};

const RISK_RANK: Record<string, number> = {
  "Low": 0, "Medium": 1, "Moderate": 1, "High": 2,
};

const DASH = "—";

type CompareRowDef = {
  label: string;
  display: (a: Analysis) => string;
  // Omitted → informational row, never scores a point (e.g. asking price:
  // cheaper isn't better, it's just cheaper)
  comparable?: (a: Analysis) => number | null;
  direction?: "higher" | "lower";
  // How many steps apart the two values must be to award the row. Defaults
  // to 1 (any real difference wins) — counts and ordinal tiers have no
  // measurement noise to filter. Only the noisy 1-10 AI scores override this
  // with SCORE_ROW_MARGIN.
  margin?: number;
};

// AI 1-10 scores drift by exactly one point on re-analysis of an identical
// listing (measured over repeated runs, every drift was 1 and none was ever
// 2), so a single step there is noise, not a finding. This margin applies
// only to that row type — applying it to every row previously muted real
// differences in counts (Red Flags) and ordinal tiers (Enthusiast Tax,
// Wallet Damage, Regret Risk).
const SCORE_ROW_MARGIN = 2;

const ROW_DEFS: CompareRowDef[] = [
  {
    label: "Investment",
    display: (a) => (a.investmentScore != null ? `${a.investmentScore}/10` : DASH),
    comparable: (a) => a.investmentScore ?? null,
    direction: "higher",
    margin: SCORE_ROW_MARGIN,
  },
  {
    label: "Character",
    display: (a) => {
      const s = computeCharacterScore(a);
      return s != null ? `${s}/10` : DASH;
    },
    comparable: (a) => computeCharacterScore(a),
    direction: "higher",
    margin: SCORE_ROW_MARGIN,
  },
  {
    label: "Street Cred",
    display: (a) => (a.vibeScore != null ? `${a.vibeScore}/10` : DASH),
    comparable: (a) => a.vibeScore ?? null,
    direction: "higher",
    margin: SCORE_ROW_MARGIN,
  },
  {
    label: "Asking",
    display: (a) => a.vehicle.price || DASH,
  },
  {
    label: "Enthusiast Tax",
    display: (a) => a.enthusiastTax?.level ?? DASH,
    comparable: (a) => TAX_RANK[a.enthusiastTax?.level] ?? null,
    direction: "lower",
  },
  {
    label: "Reliability Pain",
    display: (a) => (a.ownershipPain?.score != null ? `${a.ownershipPain.score}/10` : DASH),
    comparable: (a) => a.ownershipPain?.score ?? null,
    direction: "lower",
    margin: SCORE_ROW_MARGIN,
  },
  {
    label: "Wallet Damage",
    display: (a) => a.worstFinancialDecision?.rating ?? DASH,
    comparable: (a) => WALLET_RANK[a.worstFinancialDecision?.rating] ?? null,
    direction: "lower",
  },
  {
    label: "Classic Potential",
    display: (a) => (a.classicPotential?.score != null ? `${a.classicPotential.score}/10` : DASH),
    comparable: (a) => a.classicPotential?.score ?? null,
    direction: "higher",
    margin: SCORE_ROW_MARGIN,
  },
  {
    label: "Regret Risk",
    display: (a) => a.regretRisk?.level ?? DASH,
    comparable: (a) => RISK_RANK[a.regretRisk?.level ?? ""] ?? null,
    direction: "lower",
  },
  {
    // Scores on confirmed flags only — a warning that hangs on an unconfirmed
    // engine variant shouldn't cost a car a row the way a real one does.
    // The count still shows in full so a 3-v-1 row awarding nothing reads as
    // deliberate rather than broken.
    label: "Red Flags",
    display: (a) => {
      const total = a.redFlags?.length ?? 0;
      const confirmed = confirmedFlagCount(a);
      return total === confirmed ? String(total) : `${total} (${confirmed} confirmed)`;
    },
    comparable: (a) => confirmedFlagCount(a),
    direction: "lower",
  },
];

export type TallyRow = {
  label: string;
  aDisplay: string;
  bDisplay: string;
  winner: 0 | 1 | 2; // 0 = no points either way
  // Only meaningful when winner is 0: true means the values were genuinely
  // equal, false means they differed but fell short of the row's margin.
  // A threshold-suppressed near-miss should not read the same as a real tie.
  exact: boolean;
};

export type Tally = {
  rows: TallyRow[];
  aWins: number;
  bWins: number;
};

export function tallyUp(a: Analysis, b: Analysis): Tally {
  const rows: TallyRow[] = ROW_DEFS.map((def) => {
    let winner: 0 | 1 | 2 = 0;
    let exact = true;
    if (def.comparable && def.direction) {
      const av = def.comparable(a);
      const bv = def.comparable(b);
      if (av != null && bv != null) {
        exact = av === bv;
        const margin = def.margin ?? 1;
        if (Math.abs(av - bv) >= margin) {
          const aBetter = def.direction === "higher" ? av > bv : av < bv;
          winner = aBetter ? 1 : 2;
        }
      }
    }
    return { label: def.label, aDisplay: def.display(a), bDisplay: def.display(b), winner, exact };
  });
  return {
    rows,
    aWins: rows.filter((r) => r.winner === 1).length,
    bWins: rows.filter((r) => r.winner === 2).length,
  };
}

export function tallyQuip(aWins: number, bWins: number): string {
  const diff = Math.abs(aWins - bWins);
  if (diff === 0) return "Dead heat. Buy the one with the better service history.";
  if (diff <= 2) return "Close one — comes down to what you value most.";
  return "Not even close.";
}

// ── Head-to-head (/api/compare) ──────────────────────────────

export type HeadToHead = {
  winner: "a" | "b";
  tagline: string;
  caseFor: { a: string[]; b: string[] };
  dealBreaker: { a: string; b: string };
  myMoney: string;
  curveball?: string;
};

// Text summary of a tally for the share sheet — includes the head-to-head
// call when one has been run, since that's the bit worth arguing about.
export function buildTallyShareText(
  a: Analysis,
  b: Analysis,
  tally: Tally,
  h2h?: HeadToHead | null
): string {
  const name = (x: Analysis) => `${x.vehicle.make} ${x.vehicle.model}`;
  const titled = (x: Analysis) => {
    const withYear = [isSpecified(x.vehicle.year) ? x.vehicle.year : "", name(x)].filter(Boolean).join(" ");
    return x.vehicle.price ? `${withYear} (${x.vehicle.price})` : withYear;
  };

  const scoreLine = (["Investment", "Character", "Street Cred"] as const)
    .map((label) => {
      const row = tally.rows.find((r) => r.label === label);
      return row && row.aDisplay !== "—" && row.bDisplay !== "—"
        ? `${label} ${row.aDisplay.replace("/10", "")} v ${row.bDisplay.replace("/10", "")}`
        : "";
    })
    .filter(Boolean)
    .join(" · ");

  const tallyLine =
    tally.aWins === tally.bWins
      ? `Tally: dead heat, ${tally.aWins}–${tally.bWins}.`
      : tally.aWins > tally.bWins
        ? `Tally: ${name(a)} ${tally.aWins}–${tally.bWins}.`
        : `Tally: ${name(b)} ${tally.bWins}–${tally.aWins}.`;

  const h2hLine = h2h
    ? `Head-to-head calls it: ${name(h2h.winner === "a" ? a : b)}${h2h.tagline ? ` — "${h2h.tagline}"` : "."}`
    : "";

  return [
    `Motormind tally: ${titled(a)} v ${titled(b)}`,
    tallyLine,
    scoreLine,
    h2hLine,
    "Settle yours: www.motormind.nz",
  ].filter(Boolean).join("\n");
}

export async function fetchHeadToHead(a: Analysis, b: Analysis): Promise<HeadToHead> {
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ a, b }),
  });
  let data: (HeadToHead & { error?: string }) | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || !data || (data.winner !== "a" && data.winner !== "b")) {
    throw new Error(data?.error || `The head-to-head fell over (HTTP ${res.status}) — give it another go.`);
  }
  return data;
}
