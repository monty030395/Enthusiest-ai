// The Tally Up: pure, client-side comparison of two saved checks.
// Winner-per-row semantics: colour tracks sentiment, so "lower" wins on
// cost/pain rows and "higher" wins on score rows. Rows where either side
// has no data score no points for anyone.
import { type Analysis, computeCharacterScore } from "./analysis";

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
};

const ROW_DEFS: CompareRowDef[] = [
  {
    label: "Investment",
    display: (a) => (a.investmentScore != null ? `${a.investmentScore}/10` : DASH),
    comparable: (a) => a.investmentScore ?? null,
    direction: "higher",
  },
  {
    label: "Character",
    display: (a) => {
      const s = computeCharacterScore(a);
      return s != null ? `${s}/10` : DASH;
    },
    comparable: (a) => computeCharacterScore(a),
    direction: "higher",
  },
  {
    label: "Street Cred",
    display: (a) => (a.vibeScore != null ? `${a.vibeScore}/10` : DASH),
    comparable: (a) => a.vibeScore ?? null,
    direction: "higher",
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
  },
  {
    label: "Regret Risk",
    display: (a) => a.regretRisk?.level ?? DASH,
    comparable: (a) => RISK_RANK[a.regretRisk?.level ?? ""] ?? null,
    direction: "lower",
  },
  {
    label: "Red Flags",
    display: (a) => String(a.redFlags?.length ?? 0),
    comparable: (a) => a.redFlags?.length ?? 0,
    direction: "lower",
  },
];

export type TallyRow = {
  label: string;
  aDisplay: string;
  bDisplay: string;
  winner: 0 | 1 | 2; // 0 = no points either way
};

export type Tally = {
  rows: TallyRow[];
  aWins: number;
  bWins: number;
};

export function tallyUp(a: Analysis, b: Analysis): Tally {
  const rows: TallyRow[] = ROW_DEFS.map((def) => {
    let winner: 0 | 1 | 2 = 0;
    if (def.comparable && def.direction) {
      const av = def.comparable(a);
      const bv = def.comparable(b);
      if (av != null && bv != null && av !== bv) {
        const aBetter = def.direction === "higher" ? av > bv : av < bv;
        winner = aBetter ? 1 : 2;
      }
    }
    return { label: def.label, aDisplay: def.display(a), bDisplay: def.display(b), winner };
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
