"use client";

import { useState, useRef, type RefObject } from "react";
import {
  type Analysis,
  type DriveMetric,
  isSpecified,
  computeCharacterScore,
  getQuip,
  buildShareText,
  isConditional,
} from "../_lib/analysis";
import { shareOrCopy, createShareLink } from "../_lib/share";
import { trademeSearchUrl } from "../_lib/trademe";
import {
  V_RED, V_AMBER, V_GREEN, V_NEUTRAL,
  VERDICT_THEME_MAP, TAX_LEVEL_THEMES,
  themeToStyle,
  VerdictBadge, RatingBadge, RoastBadge,
} from "./badges";
import { Card, Pill, SectionLabel } from "./ui";
import { Cluster, Dial, HalfGauge, MultiFunctionDisplay, Odometer, TelltalePanel, lampFor, parseOdometer } from "./gauges";

// Where the fuel needle sits for each wallet-damage rating: a sensible buy
// leaves the tank nearly full, a catastrophic one runs it dry
const FUEL_LEVEL: Record<string, number> = {
  "Sensible Purchase": 0.88,
  "Manageable Pain": 0.62,
  "Emotionally Justified Disaster": 0.4,
  "Dangerous": 0.2,
  "Catastrophic Wallet Destruction": 0.04,
};

// What the fuel gauge says, in its own words. The full rating is a joke
// that wraps on a half-width gauge; it stays on the Wallet Damage card
const FUEL_READOUT: Record<string, string> = {
  "Sensible Purchase": "Sips fuel",
  "Manageable Pain": "Steady drain",
  "Emotionally Justified Disaster": "Heavy drain",
  "Dangerous": "Near empty",
  "Catastrophic Wallet Destruction": "Running on fumes",
};

// The trip computer's headline: the price verdict as a short dash readout,
// sized to sit beside the price on one line. The full verdict stays on the
// Price Analysis card. Null when there's no price to judge, so the
// listing's label shows instead.
const TRIP_READOUT: Record<string, string> = {
  "Fair": "Fair buy",
  "Premium Justified": "Fair premium",
  "Paying the Premium": "Premium price",
};

function tripReadout(assessment: string | undefined): string | null {
  if (!assessment || assessment === "No Price Listed") return null;
  return TRIP_READOUT[assessment] ?? assessment;
}

// What the temperature needle says, in the gauge's own words
function tempReadout(score: number): string {
  const state = score >= 8 ? "Running hot" : score >= 5 ? "Runs warm" : "Runs cool";
  return `${state}: ${score} of 10`;
}

// The words behind each bar on the multi-function display
function DriveNote({ metric, label }: { metric: DriveMetric; label: string }) {
  return (
    <div className="py-3 border-b border-line last:border-0">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-mfd/85 mb-1">{label}</p>
      <p className="text-ink-muted text-sm leading-relaxed">{metric.description}</p>
    </div>
  );
}

function ModPotentialCard({ data }: { data: NonNullable<Analysis["modPotential"]> }) {
  const [expanded, setExpanded] = useState(false);
  if (data.relevance === "low") return null;
  const isCollapsed = data.relevance === "medium" && !expanded;
  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Mod Potential</p>
          {data.relevance === "medium" && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint hover:text-ink-muted transition-colors flex items-center gap-1 py-3 pl-3 -my-3 -ml-3"
            >
              {expanded ? "Less ▲" : "More ▼"}
            </button>
          )}
        </div>
        {data.powerCeiling && (
          <p className="text-ink-muted text-sm leading-relaxed">{data.powerCeiling}</p>
        )}
        {!isCollapsed && (
          <div className="space-y-4 mt-4">
            {data.firstMods?.length > 0 && (
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-2">First Mods</p>
                <ul className="space-y-1.5">
                  {data.firstMods.map((mod, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-muted leading-snug">
                      <span className="text-glow-400 flex-shrink-0 font-bold">+</span>
                      {mod}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.handlingUpgrades && (
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">Handling Upgrades</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.handlingUpgrades}</p>
              </div>
            )}
            {data.partsEcosystem && (
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">Parts Ecosystem</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.partsEcosystem}</p>
              </div>
            )}
            {data.collectorRisk && (
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">Collector Risk</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.collectorRisk}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Marks a fault the analysis couldn't pin to a confirmed engine code
function ConditionalTag() {
  return (
    <span
      className="ml-2 align-middle font-mono text-xs font-bold uppercase tracking-[0.12em] rounded px-1.5 py-0.5 whitespace-nowrap"
      style={{ color: V_AMBER.text, backgroundColor: V_AMBER.bg, border: `1px solid ${V_AMBER.border}` }}
    >
      If confirmed
    </span>
  );
}

function TileHeader({ label, score, quip }: { label: string; score: number | null; quip?: string }) {
  const numColor =
    score === null ? "text-ink-faint"
    : score >= 7 ? "text-emerald-400"
    : score >= 5 ? "text-amber-400"
    : "text-red-400";
  return (
    <div className="pt-4 space-y-1.5">
      <div className="flex items-center gap-3">
        <span className="font-display text-lg font-bold uppercase tracking-[0.06em] text-ink">{label}</span>
        <div className="flex-1 h-px bg-line" />
        {score !== null && (
          <span className={`rounded-md bg-dial ring-1 ring-line px-2 py-0.5 font-mono text-base tabular-nums [text-shadow:0_0_6px_currentColor] ${numColor}`}>
            {score}<span className="text-ink-faint text-xs [text-shadow:none]">/10</span>
          </span>
        )}
      </div>
      {quip && (
        <p className="text-sm italic text-ink-faint">{quip}</p>
      )}
    </div>
  );
}

// The full results view, rendered purely from an Analysis object — used for
// fresh checks on the home page and reopened checks in the Garage.
export default function AnalysisResults({
  analysis: result,
  showShare = true,
}: {
  analysis: Analysis;
  // Public shared pages render read-only — no re-sharing a shared link
  showShare?: boolean;
}) {
  const investmentSectionRef = useRef<HTMLDivElement>(null);
  const characterSectionRef = useRef<HTMLDivElement>(null);
  const streetCredSectionRef = useRef<HTMLDivElement>(null);
  const priceVerdictRef = useRef<HTMLDivElement>(null);
  const ownerVibeRef = useRef<HTMLDivElement>(null);
  const reliabilityRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const takeRef = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const characterScore = computeCharacterScore(result);
  // The trip computer leads with the price verdict; the listing's label
  // drops to the small line unless there's no verdict to show
  const tripHeadline = tripReadout(result.priceVerdict?.assessment);
  const tripDetail = [
    result.vehicle.variant,
    isSpecified(result.vehicle.importStatus) ? result.vehicle.importStatus : "",
    tripHeadline ? result.label : "",
  ].filter(Boolean).join(" · ");
  const [shareNote, setShareNote] = useState("");
  const [sharing, setSharing] = useState(false);

  async function shareVerdict() {
    setSharing(true);
    setShareNote("");
    // A link lets them read the whole thing in the real app; if link sharing
    // isn't available the text summary still goes out on its own
    const link = await createShareLink({ kind: "check", analysis: result });
    setSharing(false);
    const outcome = await shareOrCopy(buildShareText(result), link ?? undefined);
    if (outcome === "shared" || outcome === "cancelled") return;
    setShareNote(
      outcome === "copied"
        ? link ? "Link copied — paste it in the group chat." : "Copied — paste it in the group chat."
        : "Couldn't share from here — screenshot the verdict instead."
    );
    setTimeout(() => setShareNote(""), 4000);
  }

  return (
    <div className="space-y-4">

      {/* ── THE DASH ──────────────────────────────────────
          Everything a buyer needs at a glance, sized to fit one phone
          screen: the dials, the trip computer, the warning lamps and the
          temperature and fuel gauges. The detail cards follow below. */}
      <div className="space-y-2.5">

        {/* The cluster: tap a dial to jump to its section */}
        <Cluster
          dials={[
            {
              label: "Investment",
              short: "Invest",
              score: result.investmentScore ?? null,
              onClick: () => scrollTo(investmentSectionRef),
            },
            {
              label: "Character",
              score: characterScore,
              onClick: () => scrollTo(characterSectionRef),
            },
            {
              label: "Street Cred",
              short: "Cred",
              score: result.vibeScore ?? null,
              onClick: () => scrollTo(streetCredSectionRef),
            },
          ]}
        />

        {/* Trip computer: the price verdict, then the car. Tap for the
            price analysis */}
        <button
          type="button"
          onClick={() => scrollTo(priceVerdictRef)}
          disabled={!result.priceVerdict}
          className="w-full text-left rounded-lg bg-dial ring-1 ring-line px-3.5 py-3 font-mono text-mfd shadow-[inset_0_0_18px_rgba(255,173,59,0.06)] [text-shadow:0_0_6px_rgba(255,173,59,0.45)] active:scale-[0.99] transition-transform"
        >
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-xl min-[360px]:text-2xl uppercase tracking-[0.06em] leading-tight">
              {tripHeadline ?? result.label}
              {tripHeadline && result.priceVerdict.assessment in TRIP_READOUT && result.priceVerdict.assessment !== "Fair" && (
                <span className="sr-only">: {result.priceVerdict.assessment}</span>
              )}
            </span>
            {result.vehicle.price && (
              <span className="text-lg tabular-nums whitespace-nowrap">{result.vehicle.price}</span>
            )}
          </span>
          <span className="block mt-1.5 font-display font-bold text-xl text-ink leading-tight [text-shadow:none]">
            {result.vehicle.year} {result.vehicle.make} {result.vehicle.model}
          </span>
          {tripDetail && <span className="block mt-0.5 text-sm text-mfd/75">{tripDetail}</span>}
        </button>

        {/* Odometer and the listing's particulars */}
        <div className="flex flex-wrap items-center gap-2">
          {isSpecified(result.vehicle.mileage) && (() => {
            const odo = parseOdometer(result.vehicle.mileage);
            return odo ? <Odometer digits={odo} /> : <Pill>{result.vehicle.mileage}</Pill>;
          })()}
          {isSpecified(result.vehicle.location) && <Pill>{result.vehicle.location}</Pill>}
          {isSpecified(result.vehicle.transmission) && <Pill>{result.vehicle.transmission}</Pill>}
          {result.mode === "roast" && <RoastBadge />}
        </div>

        {/* Warning lamps: red for a confirmed fault, amber for one that
            hinges on the variant, all dark when the listing is clean. Each
            flag's explanation opens on tap so the dash stays on one screen */}
        {(() => {
          const flags = (result.redFlags ?? []).map((f) => ({ ...f, kind: lampFor(`${f.flag} ${f.explanation}`), conditional: isConditional(f) }));
          const anyConfirmed = flags.some((f) => !f.conditional);
          return (
            <div className="rounded-xl bg-dial/60 ring-1 ring-line p-3 space-y-2.5">
              <p
                className="font-display text-xs font-bold uppercase tracking-[0.08em]"
                style={{ color: flags.length === 0 ? undefined : anyConfirmed ? V_RED.text : V_AMBER.text }}
              >
                {flags.length === 0 ? <span className="text-ink-faint">Warning lamps: all clear</span>
                  : anyConfirmed ? "Warning lamps: read before buying"
                  : "Warning lamps: depends on the variant"}
              </p>
              <TelltalePanel flags={flags} size="sm" />
              {flags.length > 0 && (
                <ul className="divide-y divide-line">
                  {flags.map((f, i) => (
                    <li key={i}>
                      <details className="group">
                        <summary className="flex items-center gap-2.5 py-1 min-h-10 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          <span
                            className="flex-none w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: f.conditional ? "var(--color-mfd)" : "var(--color-needle)" }}
                            aria-hidden="true"
                          />
                          <span className="flex-1 font-bold text-sm text-ink leading-snug">
                            {f.flag}
                            {f.conditional && <ConditionalTag />}
                          </span>
                          <span className="flex-none text-ink-faint text-xs transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
                        </summary>
                        <p className="text-xs pb-3 pl-5 leading-relaxed text-ink-muted">{f.explanation}</p>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}

        {/* Temperature (reliability) and fuel (wallet damage). Tap for the
            details further down */}
        {(result.ownershipPain || FUEL_LEVEL[result.worstFinancialDecision?.rating ?? ""] !== undefined) && (
          <div className="grid grid-cols-2 gap-3">
            {result.ownershipPain && (
              <button
                type="button"
                onClick={() => scrollTo(reliabilityRef)}
                className="rounded-xl bg-dial ring-1 ring-line px-2.5 pt-2 pb-2.5 grid justify-items-center gap-0.5 text-center active:scale-[0.98] transition-transform"
              >
                <span className="justify-self-start font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Reliability risk</span>
                <HalfGauge level={result.ownershipPain.score / 10} left="C" right="H" danger="right" />
                <span className="font-display text-xs font-semibold text-ink">{tempReadout(result.ownershipPain.score)}</span>
              </button>
            )}
            {result.worstFinancialDecision && FUEL_LEVEL[result.worstFinancialDecision.rating] !== undefined && (
              <button
                type="button"
                onClick={() => scrollTo(walletRef)}
                className="rounded-xl bg-dial ring-1 ring-line px-2.5 pt-2 pb-2.5 grid justify-items-center gap-0.5 text-center active:scale-[0.98] transition-transform"
              >
                <span className="justify-self-start font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">Wallet damage</span>
                <HalfGauge level={FUEL_LEVEL[result.worstFinancialDecision.rating]} left="E" right="F" danger="left" />
                <span className="font-display text-xs font-semibold text-ink">
                  {FUEL_READOUT[result.worstFinancialDecision.rating] ?? result.worstFinancialDecision.rating}
                  <span className="sr-only">: {result.worstFinancialDecision.rating}</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── THE SHORT VERDICT ─────────────────────────────
          Right under the dash so people who stop scrolling here still get
          the call, a way to send it, and a jump to the full take */}
      {(result.verdict || showShare) && (
        <Card className="p-5 space-y-4">
          {result.verdict && (
            <p className="text-ink text-[15px] leading-relaxed">{result.verdict}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {showShare && (
              <button
                onClick={shareVerdict}
                disabled={sharing}
                className="min-h-11 rounded-lg bg-glow-500 hover:bg-glow-400 active:bg-glow-600 disabled:bg-carbon-800 disabled:text-ink-faint text-carbon-950 px-4 font-display text-sm font-bold uppercase tracking-[0.06em] transition-colors"
              >
                {sharing ? "Building the link..." : "Share the verdict"}
              </button>
            )}
            {result.enthusiastTake && (
              <button
                type="button"
                onClick={() => scrollTo(takeRef)}
                className="min-h-11 font-display text-sm font-semibold text-glow-400 hover:text-glow-300 transition-colors"
              >
                Read the full take ↓
              </button>
            )}
          </div>
          {shareNote && <p className="text-xs text-ink-faint">{shareNote}</p>}
        </Card>
      )}

      {/* ── UNDER THE DASH: specs and what makes it special ─ */}
      {(result.performanceSpecs?.engine || result.whatMakesSpecial) && (
        <Card className="overflow-hidden">
          <div className="p-6 space-y-5">

          {/* Performance specs */}
          {result.performanceSpecs?.engine && (
            <div>
              <SectionLabel>Performance Specs</SectionLabel>
              <p className="font-mono text-ink font-bold text-sm mb-5">{result.performanceSpecs.engine}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {result.performanceSpecs.powerKw > 0 && (
                  <div>
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">Power</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">
                      {result.performanceSpecs.powerKw}kW
                      {result.performanceSpecs.powerHp > 0 && <span className="text-ink-faint font-normal"> / {result.performanceSpecs.powerHp}hp</span>}
                    </p>
                  </div>
                )}
                {result.performanceSpecs.torqueNm > 0 && (
                  <div>
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">Torque</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">
                      {result.performanceSpecs.torqueNm}Nm
                      {result.performanceSpecs.torqueRpm && <span className="text-ink-faint font-normal"> @ {result.performanceSpecs.torqueRpm}rpm</span>}
                    </p>
                  </div>
                )}
                {result.performanceSpecs.zeroToHundred && (
                  <div>
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">0–100 km/h</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">{result.performanceSpecs.zeroToHundred}</p>
                  </div>
                )}
                {result.performanceSpecs.kerbWeightKg > 0 && (
                  <div>
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">Kerb Weight</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">{result.performanceSpecs.kerbWeightKg}kg</p>
                  </div>
                )}
                {result.performanceSpecs.drivetrain && (
                  <div>
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint mb-1">Drivetrain</p>
                    <p className="font-mono text-ink font-bold text-sm">{result.performanceSpecs.drivetrain}</p>
                  </div>
                )}
              </div>
              {result.performanceSpecs.jdmNote && (
                <p className="text-glow-300/80 text-xs mt-5 pt-4 border-t border-line leading-snug">{result.performanceSpecs.jdmNote}</p>
              )}
            </div>
          )}

          {/* Pull-quote */}
          {result.whatMakesSpecial && (
            <div className="pl-4 border-l-2 border-glow-400">
              <p className="text-ink text-[17px] font-medium italic leading-snug">{result.whatMakesSpecial}</p>
            </div>
          )}


          </div>
        </Card>
      )}

      {/* ── SECTION 1: INVESTMENT ───────────────────────── */}
      <div id="investment" ref={investmentSectionRef} className="scroll-mt-16 space-y-4">
        <TileHeader label="Investment" score={result.investmentScore ?? null} quip={getQuip("investment", result.investmentScore ?? null)} />

        {/* Price Analysis */}
        {result.priceVerdict && (
          <div ref={priceVerdictRef} className="scroll-mt-16">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
                <SectionLabel>Price Analysis</SectionLabel>
                <VerdictBadge verdict={result.priceVerdict.assessment} />
              </div>
              <p className="text-ink-muted text-sm leading-relaxed">{result.priceVerdict.reason}</p>
            </Card>
          </div>
        )}

        {/* Price Reality Check */}
        {result.enthusiastTax && (
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
              <SectionLabel>Enthusiast Tax</SectionLabel>
              {result.enthusiastTax.premium && (
                <span style={themeToStyle(VERDICT_THEME_MAP[result.enthusiastTax.level] ?? V_NEUTRAL)}>
                  {result.enthusiastTax.premium}
                </span>
              )}
            </div>
            {result.enthusiastTax.reasons?.length > 0 && (
              <ul className="space-y-2.5">
                {result.enthusiastTax.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-muted leading-snug">
                    <span className="flex-shrink-0 font-mono font-bold" style={{ color: (TAX_LEVEL_THEMES[result.enthusiastTax.level] ?? V_NEUTRAL).text }}>$</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Price Outlook */}
        {result.priceOutlook && (
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
              <SectionLabel>Price Outlook</SectionLabel>
              <VerdictBadge verdict={result.priceOutlook.trend} />
            </div>
            <p className="text-ink-muted text-sm leading-relaxed">{result.priceOutlook.reason}</p>
            <p className="font-mono text-ink-faint text-xs mt-2.5">Based on enthusiast market trends, not live pricing data.</p>
          </Card>
        )}

        {/* Wallet Damage Rating — the arrows take the verdict badge's colour
            so they can't disagree with it */}
        {result.worstFinancialDecision && (() => {
          const t = VERDICT_THEME_MAP[result.worstFinancialDecision.rating] ?? V_NEUTRAL;
          return (
            <div ref={walletRef} className="scroll-mt-16">
            <Card className="p-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
                  <SectionLabel>Wallet Damage Rating</SectionLabel>
                  <VerdictBadge verdict={result.worstFinancialDecision.rating} />
                </div>
                {result.worstFinancialDecision.reasons?.length > 0 && (
                  <ul className="space-y-2.5">
                    {result.worstFinancialDecision.reasons.map((r, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-ink/85 leading-snug">
                        <span className="flex-shrink-0 font-mono font-bold" style={{ color: t.text }}>→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
            </div>
          );
        })()}

        {/* Reliability Risk — issue borders carry the severity colour of the
            card's verdict badge, not the brand accent */}
        {result.ownershipPain && (() => {
          const t = result.ownershipPain.score >= 8 ? V_RED : result.ownershipPain.score >= 5 ? V_AMBER : V_GREEN;
          return (
            <div ref={reliabilityRef} className="scroll-mt-16">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
                <SectionLabel>Reliability Risk</SectionLabel>
                <VerdictBadge verdict={result.ownershipPain.score >= 8 ? "High Pain" : result.ownershipPain.score >= 5 ? "Moderate" : "Low Pain"} />
              </div>
              {result.ownershipPain.issues?.length > 0 && (
                <ul className="space-y-3.5 mt-1">
                  {result.ownershipPain.issues.map((issue, i) => {
                    // A fault that hinges on an unconfirmed engine variant never
                    // renders at the card's full severity
                    const cond = isConditional(issue);
                    const it = cond ? V_AMBER : t;
                    return (
                      <li key={i} className="pl-3.5 border-l-2 py-0.5" style={{ borderColor: it.border }}>
                        <p className="font-bold text-ink text-sm">
                          {issue.title}
                          {cond && <ConditionalTag />}
                        </p>
                        {issue.detail && (
                          <p className="text-ink-faint text-xs mt-1 leading-relaxed">{issue.detail}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
            </div>
          );
        })()}

        {/* Market Trend */}
        {result.marketTrend && (
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
              <SectionLabel>Market Trend</SectionLabel>
              <VerdictBadge verdict={result.marketTrend.trend} />
            </div>
            <p className="text-ink-muted text-sm leading-relaxed">{result.marketTrend.reason}</p>
          </Card>
        )}

        {/* Future Classic Potential */}
        {result.classicPotential && (
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
              <SectionLabel>Future Classic Potential</SectionLabel>
              <span className="w-20 rounded-full bg-dial" role="img" aria-label={`${result.classicPotential.score} out of 10`}>
                <Dial score={result.classicPotential.score} label="Classic" />
              </span>
            </div>
            {result.classicPotential.reasons?.length > 0 && (
              <ul className="space-y-2">
                {result.classicPotential.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-ink-muted leading-relaxed">
                    <span className="text-glow-600 flex-shrink-0">▸</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {/* ── SECTION 2: CHARACTER ────────────────────────── */}
      <div id="character" ref={characterSectionRef} className="scroll-mt-16 space-y-4">
        <TileHeader label="Character" score={characterScore} quip={getQuip("character", characterScore)} />

        {/* Why Enthusiasts Care */}
        {result.whyEnthusiastsCare && (
          <Card className="p-6">
            <SectionLabel>Why Enthusiasts Care</SectionLabel>
            <p className="text-ink/85 text-sm leading-relaxed">{result.whyEnthusiastsCare}</p>
          </Card>
        )}

        {/* Driving Character */}
        {result.drivingCharacter && (
          <Card className="p-6">
            <SectionLabel>Driving Character</SectionLabel>
            <MultiFunctionDisplay
              rows={[
                { label: "Steering", score: result.drivingCharacter.steeringFeel.score },
                { label: "Engine", score: result.drivingCharacter.engineCharacter.score },
                { label: "Daily", score: result.drivingCharacter.dailyComfort.score },
                { label: "Fun", score: result.drivingCharacter.overallFun.score },
              ]}
            />
            <div className="mt-2">
              <DriveNote metric={result.drivingCharacter.steeringFeel} label="Steering" />
              <DriveNote metric={result.drivingCharacter.engineCharacter} label="Engine" />
              <DriveNote metric={result.drivingCharacter.dailyComfort} label="Daily" />
              <DriveNote metric={result.drivingCharacter.overallFun} label="Fun" />
            </div>
            {result.drivingCharacter.summary && (
              <p className="text-ink-muted text-xs italic leading-relaxed border-t border-line pt-4 mt-1">
                {result.drivingCharacter.summary}
              </p>
            )}
          </Card>
        )}

        {/* Mod Potential */}
        {result.modPotential && <ModPotentialCard data={result.modPotential} />}
      </div>

      {/* ── SECTION 3: STREET CRED ──────────────────────── */}
      <div id="street-cred" ref={streetCredSectionRef} className="scroll-mt-16 space-y-4">
        <TileHeader label="Street Cred" score={result.vibeScore ?? null} />

        {/* Owner Vibe */}
        {result.ownerVibe?.label && (
          <div ref={ownerVibeRef} className="scroll-mt-16">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3">
                <SectionLabel>Owner Vibe</SectionLabel>
                <VerdictBadge verdict={result.ownerVibe.label} />
              </div>
              {result.ownerVibe.reasoning && (
                <p className="text-ink-muted text-sm leading-relaxed">{result.ownerVibe.reasoning}</p>
              )}
            </Card>
          </div>
        )}

        {/* Cars & Coffee + Community Credibility. The analysis can come back
            with these as empty strings, so a row only shows if it has
            something to say — an empty badge looks like it failed to load */}
        {(() => {
          const rows = [
            { label: "Cars & Coffee", data: result.carsCoffee },
            { label: "Community Credibility", data: result.communityCredibility },
          ].filter((r) => r.data?.rating?.trim() || r.data?.description?.trim());
          const standing = result.socialStanding?.trim();
          if (rows.length === 0 && !standing) return null;
          return (
            <Card className="p-6 space-y-5">
              {rows.map((r, i) => (
                <div key={r.label} className={i > 0 ? "pt-5 border-t border-line" : ""}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
                    <SectionLabel>{r.label}</SectionLabel>
                    {r.data?.rating?.trim() && <RatingBadge rating={r.data.rating} />}
                  </div>
                  {r.data?.description?.trim() && (
                    <p className="text-ink-muted text-sm leading-relaxed">{r.data.description}</p>
                  )}
                </div>
              ))}
              {standing && (
                <div className={rows.length > 0 ? "pt-5 border-t border-line" : ""}>
                  <p className="text-ink-muted text-sm italic leading-relaxed pl-3.5 border-l-2 border-glow-500/60">
                    {standing}
                  </p>
                </div>
              )}
            </Card>
          );
        })()}

        {/* Regret Risk */}
        {result.regretRisk && (
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
              <SectionLabel>Regret Risk</SectionLabel>
              <VerdictBadge verdict={result.regretRisk.level} />
            </div>
            <p className="text-ink-muted text-sm leading-relaxed">{result.regretRisk.reason}</p>
          </Card>
        )}
      </div>

      {/* ── SPEC SIGNIFICANCE ───────────────────────────── */}
      {result.specSignificance?.length > 0 && (
        <div className="space-y-3">
          <TileHeader label="Spec Significance" score={null} />
          <Card className="p-6">
            <ul className="space-y-3.5">
              {result.specSignificance.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-glow-400 flex-shrink-0 font-bold mt-0.5">+</span>
                  <div>
                    <span className="font-bold text-ink text-sm">{s.item}</span>
                    {s.note && <p className="text-ink-faint text-xs mt-1 leading-relaxed">{s.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* ── ASK THE SELLER ──────────────────────────────── */}
      {result.questionsToAsk?.length > 0 && (
        <div className="space-y-3">
          <TileHeader label="Ask the Seller" score={null} />
          <Card className="p-6">
            <ol className="space-y-3.5">
              {result.questionsToAsk.map((q, i) => (
                <li key={i} className="flex gap-3.5 text-sm border-b border-line pb-3.5 last:border-0 last:pb-0">
                  <span className="font-mono text-glow-500 font-bold w-5 flex-shrink-0 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-ink/85 leading-snug">{q}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {/* ── YOU MIGHT ALSO CONSIDER ─────────────────────── */}
      {result.alternatives && result.alternatives.length > 0 && (
        <div className="space-y-3">
          <TileHeader label="You Might Also Consider" score={null} />
          <Card className="p-6 space-y-5">
            {result.alternatives.map((alt, i) => (
              <div key={i} className={i > 0 ? "pt-5 border-t border-line" : ""}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-bold text-ink text-sm leading-snug">{alt.name}</p>
                  {alt.priceRange && (
                    <span className="flex-shrink-0 font-mono text-xs font-medium text-ink-muted bg-white/[0.04] border border-line px-2.5 py-1 rounded whitespace-nowrap tabular-nums">
                      {alt.priceRange}
                    </span>
                  )}
                </div>
                <p className="text-ink-muted text-sm leading-relaxed">{alt.whySuited}</p>
                <p className="text-ink-faint text-xs leading-relaxed mt-1.5">{alt.howDiffers}</p>
                {/* New tab, so the app is still here when they come back */}
                <a
                  href={trademeSearchUrl(alt.searchTerm || alt.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 min-h-10 font-mono text-xs font-medium uppercase tracking-[0.12em] text-glow-400 hover:text-glow-300 transition-colors"
                >
                  Find on Trade Me <span aria-hidden="true">↗</span>
                </a>
              </div>
            ))}
            <p className="font-mono text-ink-faint text-xs leading-relaxed pt-3 border-t border-line">
              These are AI suggestions from general market knowledge, not listings we&apos;ve seen. The prices are rough estimates and appreciating cars can run well past them — each link searches Trade Me for that car, so trust what comes back over what we guessed.
            </p>
          </Card>
        </div>
      )}

      {/* ── THE ENTHUSIAST TAKE ─────────────────────────── */}
      {result.enthusiastTake && (
        <div ref={takeRef} className="scroll-mt-16 rounded-xl bg-dial ring-1 ring-glow-600/40 overflow-hidden">
          <div className="px-6 pt-5">
            <span className="font-mono text-base uppercase tracking-[0.06em] text-mfd [text-shadow:0_0_6px_rgba(255,173,59,0.45)]">
              The Enthusiast Take
            </span>
          </div>
          <div className="px-6 pt-3 pb-6">
            <p className="text-ink leading-relaxed text-[15px]">{result.enthusiastTake}</p>
          </div>
        </div>
      )}

      {/* Share */}
      {showShare && (
        <div className="space-y-2">
          <button
            onClick={shareVerdict}
            disabled={sharing}
            className="w-full min-h-12 rounded-lg bg-glow-500 hover:bg-glow-400 active:bg-glow-600 disabled:bg-carbon-800 disabled:text-ink-faint text-carbon-950 font-display text-sm font-bold uppercase tracking-[0.06em] transition-colors"
          >
            {sharing ? "Building the link..." : "Share the verdict"}
          </button>
          {shareNote && (
            <p className="font-mono text-xs text-ink-faint text-center">{shareNote}</p>
          )}
        </div>
      )}

    </div>
  );
}
