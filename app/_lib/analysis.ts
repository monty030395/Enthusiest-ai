// Shared analysis types + pure helpers. No React, no browser APIs.

export type DriveMetric = { score: number; description: string };

export type Analysis = {
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

export function isSpecified(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return !["not provided", "not specified", "unknown", "n/a", "-", ""].includes(lower);
}

export function computeCharacterScore(a: Analysis): number | null {
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

export function getQuip(section: "character" | "investment", score: number | null): string {
  if (score === null) return "";
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
