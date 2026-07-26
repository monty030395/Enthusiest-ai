// ── Verdict badge colour system ───────────────────────────────
// Warm-tuned signal palette to sit on the carbon/ember theme.
// Colour tracks sentiment: red negative, amber caution, green positive,
// blue neutral. Every signal element on a card must derive from the same
// theme as the card's badge.

export type VerdictTheme = { bg: string; border: string; text: string };

export const V_RED:     VerdictTheme = { bg: "#2a100b", border: "#803023", text: "#ff9d8a" };
export const V_AMBER:   VerdictTheme = { bg: "#271b06", border: "#7a5a1e", text: "#ffc96b" };
export const V_GREEN:   VerdictTheme = { bg: "#0e2316", border: "#2f5e40", text: "#93dbad" };
export const V_BLUE:    VerdictTheme = { bg: "#101b29", border: "#31506f", text: "#a3bedf" };
export const V_NEUTRAL: VerdictTheme = { bg: "#1c1c20", border: "#3a3a42", text: "#a6a29a" };

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
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.14em",
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
