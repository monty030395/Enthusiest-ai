// ── Verdict badge colour system ───────────────────────────────
// Signal palette tuned to sit on the petrol-blue Night dash panels.
// Colour tracks sentiment: red negative, amber caution, green positive,
// blue neutral. Every signal element on a card must derive from the same
// theme as the card's badge.

export type VerdictTheme = { bg: string; border: string; text: string };

export const V_RED:     VerdictTheme = { bg: "#2a1418", border: "#7a2c31", text: "#ff8f86" };
export const V_AMBER:   VerdictTheme = { bg: "#262110", border: "#7a5d20", text: "#ffc566" };
export const V_GREEN:   VerdictTheme = { bg: "#0d2522", border: "#2a5e50", text: "#8fe0c4" };
export const V_BLUE:    VerdictTheme = { bg: "#0f2233", border: "#2f5a7d", text: "#a9d8ff" };
export const V_NEUTRAL: VerdictTheme = { bg: "#15252e", border: "#2f4552", text: "#a4bac3" };
// Roast Mode's own theme — flame orange, deliberately distinct from V_AMBER so
// it never reads as a severity signal. It's a modifier on a check, not part
// of the verdict system above.
export const V_EMBER: VerdictTheme = { bg: "#2b1a14", border: "#8a4524", text: "#ff9f5a" };

export const VERDICT_THEME_MAP: Record<string, VerdictTheme> = {
  // Hero labels
  "Hidden Gem": V_GREEN, "Future Classic": V_GREEN, "Underrated": V_GREEN,
  "Premium Asking Price": V_AMBER, "Overrated": V_AMBER,
  "Cheap Thrill": V_BLUE, "Peak Daily Driver": V_BLUE,
  "Money Pit": V_RED,
  // Price assessment
  "Fair": V_GREEN, "Underpriced": V_GREEN, "Premium Justified": V_GREEN,
  "Overpriced": V_RED, "Paying the Premium": V_AMBER,
  // Enthusiast tax level
  "None": V_BLUE, "Mild": V_AMBER, "Moderate": V_AMBER,
  "High": V_RED, "Extreme": V_RED,
  // Price / market trend
  "Stable": V_BLUE, "Rising": V_GREEN, "Falling": V_RED, "Declining": V_RED,
  // Wallet damage rating
  "Sensible Purchase": V_GREEN,
  "Manageable Pain": V_AMBER,
  "Emotionally Justified Disaster": V_AMBER,
  "Dangerous": V_RED,
  "Catastrophic Wallet Destruction": V_RED,
  // Reliability risk derived labels
  "Low Pain": V_GREEN, "High Pain": V_RED,
  // Regret risk level  ("Moderate" and "High" already covered above)
  "Low": V_GREEN, "Medium": V_AMBER,
  // Owner vibe
  "Mature Enthusiast Owner": V_GREEN, "Grandpa-Owned Gem": V_GREEN,
  "Weekend Warrior": V_BLUE, "Rich Dentist Spec": V_BLUE,
  "Motivated Seller": V_AMBER, "Deferred Maintenance Energy": V_AMBER,
  "Drift Missile History": V_AMBER, "TikTok Build": V_AMBER,
  "Optimistic Dreamer": V_AMBER, "Dealer Dressed as Private": V_RED,
};

// $ bullet colour tracks the same V_* theme as the level's badge, so the
// bullets and the premium badge can never disagree about severity.
export const TAX_LEVEL_THEMES: Record<string, VerdictTheme> = {
  "None": V_BLUE, "Mild": V_AMBER, "Moderate": V_AMBER, "High": V_RED, "Extreme": V_RED,
};

export function themeToStyle(t: VerdictTheme) {
  return {
    display: "inline-block" as const,
    backgroundColor: t.bg,
    border: `1px solid ${t.border}`,
    color: t.text,
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "4px 10px",
    borderRadius: "3px",
    // Never wrap inside a badge — header rows flex-wrap instead, so a long
    // badge drops to its own line rather than breaking mid-label
    whiteSpace: "nowrap" as const,
  };
}

export function verdictBadgeStyle(verdict: string) {
  return themeToStyle(VERDICT_THEME_MAP[verdict] ?? V_NEUTRAL);
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  return <span style={verdictBadgeStyle(verdict)}>{verdict}</span>;
}

const RATING_THEME_MAP: Record<string, VerdictTheme> = {
  "High": V_GREEN, "Medium": V_BLUE, "Low": V_AMBER,
};

export function RatingBadge({ rating }: { rating: string }) {
  return <span style={themeToStyle(RATING_THEME_MAP[rating] ?? V_NEUTRAL)}>{rating}</span>;
}

export function RoastBadge() {
  return <span style={themeToStyle(V_EMBER)}>🔥 Roasted</span>;
}
