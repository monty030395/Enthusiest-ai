"use client";

import { useState, useRef } from "react";
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
  themeToStyle, verdictBadgeStyle,
  VerdictBadge, RatingBadge,
} from "./badges";
import { Card, Pill, SectionLabel } from "./ui";

// Single-column drive row — matches mockup layout
function DriveScoreRow({ metric, label }: { metric: DriveMetric; label: string }) {
  const color =
    metric.score >= 7 ? "text-emerald-400"
    : metric.score >= 5 ? "text-amber-400"
    : "text-red-500";
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-line last:border-0">
      <span className={`font-mono text-xl font-bold tabular-nums min-w-[30px] leading-none pt-0.5 ${color}`}>
        {metric.score}
      </span>
      <div>
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint mb-1.5">{label}</p>
        <p className="text-ink-muted text-sm leading-relaxed">{metric.description}</p>
      </div>
    </div>
  );
}

function ScoreChip({ label, score, onClick }: { label: string; score: number | null; onClick: () => void }) {
  const numColor =
    score === null ? "text-ink-faint"
    : score >= 7 ? "text-emerald-400"
    : score >= 5 ? "text-amber-400"
    : "text-red-400";
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-3.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-line hover:border-line-strong active:scale-95 transition-all"
    >
      <span className={`font-mono text-2xl font-bold tabular-nums leading-none ${numColor}`}>
        {score !== null ? score : "?"}
        <span className="text-ink-faint text-xs font-normal">/10</span>
      </span>
      <span className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint whitespace-nowrap">{label}</span>
    </button>
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
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">Mod Potential</p>
          {data.relevance === "medium" && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-ink-faint hover:text-ink-muted transition-colors flex items-center gap-1 py-3 pl-3 -my-3 -ml-3"
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
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-2">First Mods</p>
                <ul className="space-y-1.5">
                  {data.firstMods.map((mod, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-muted leading-snug">
                      <span className="text-ember-400 flex-shrink-0 font-bold">+</span>
                      {mod}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.handlingUpgrades && (
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Handling Upgrades</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.handlingUpgrades}</p>
              </div>
            )}
            {data.partsEcosystem && (
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Parts Ecosystem</p>
                <p className="text-ink-muted text-sm leading-relaxed">{data.partsEcosystem}</p>
              </div>
            )}
            {data.collectorRisk && (
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Collector Risk</p>
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
      className="ml-2 align-middle font-mono text-[8px] font-bold uppercase tracking-[0.16em] rounded px-1.5 py-0.5 whitespace-nowrap"
      style={{ color: V_AMBER.text, backgroundColor: V_AMBER.bg, border: `1px solid ${V_AMBER.border}` }}
    >
      If confirmed
    </span>
  );
}

function TileHeader({ label, score, quip, index }: { label: string; score: number | null; quip?: string; index?: string }) {
  const numColor =
    score === null ? "text-ink-faint"
    : score >= 7 ? "text-emerald-400"
    : score >= 5 ? "text-amber-400"
    : "text-red-400";
  return (
    <div className="pt-4 space-y-1.5">
      <div className="flex items-baseline gap-3">
        {index && (
          <span className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink/15 select-none">{index}</span>
        )}
        <span className="font-display text-base font-bold uppercase tracking-[0.14em] text-ink">{label}</span>
        <div className="flex-1 h-px bg-line self-center" />
        {score !== null && (
          <span className={`font-mono text-sm font-bold tabular-nums ${numColor}`}>
            {score}<span className="text-ink-faint text-xs font-normal">/10</span>
          </span>
        )}
      </div>
      {quip && (
        <p className="font-mono text-[11px] italic text-ink-faint pl-0.5">{quip}</p>
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

  const characterScore = computeCharacterScore(result);
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

      {/* ── HERO TILE ───────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-px bg-gradient-to-r from-ember-500 via-ember-500/40 to-transparent" />
        <div className="p-6 sm:p-7 space-y-5">

          {/* Year / import / location + price */}
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-ink-faint pt-1.5">
              {result.vehicle.year}
              {isSpecified(result.vehicle.importStatus) ? ` · ${result.vehicle.importStatus}` : ""}
              {isSpecified(result.vehicle.location) ? ` · ${result.vehicle.location}` : ""}
            </p>
            {result.vehicle.price && (
              <div className="bg-ember-500 rounded-lg px-4 py-2 text-right flex-shrink-0">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-carbon-950/60">Asking</p>
                <p className="font-mono text-xl font-bold text-carbon-950 tabular-nums">{result.vehicle.price}</p>
              </div>
            )}
          </div>

          {/* Make / model / variant */}
          <div>
            <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-tight">
              {result.vehicle.make} {result.vehicle.model}
            </h3>
            {result.vehicle.variant && (
              <p className="text-ink-muted font-medium mt-1">{result.vehicle.variant}</p>
            )}
          </div>

          {/* Spec pills + label badge + owner vibe */}
          <div className="flex flex-wrap items-center gap-2">
            {isSpecified(result.vehicle.mileage) && <Pill>{result.vehicle.mileage}</Pill>}
            {isSpecified(result.vehicle.transmission) && <Pill>{result.vehicle.transmission}</Pill>}
            {isSpecified(result.vehicle.colour) && <Pill>{result.vehicle.colour}</Pill>}
            {result.label && (
              <button
                title="Tap to view details"
                onClick={() => priceVerdictRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ ...verdictBadgeStyle(result.label), display: "inline-flex", alignItems: "center" }}
                className="gap-1.5 min-h-10 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                {result.label}
                <span className="opacity-70 text-[9px] leading-none">↓</span>
              </button>
            )}
            {result.ownerVibe?.label && (
              <button
                title="Tap to view details"
                onClick={() => ownerVibeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ ...verdictBadgeStyle(result.ownerVibe.label), display: "inline-flex", alignItems: "center" }}
                className="gap-1.5 min-h-10 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                {result.ownerVibe.label}
                <span className="opacity-70 text-[9px] leading-none">↓</span>
              </button>
            )}
          </div>

          {/* Pull-quote */}
          {result.whatMakesSpecial && (
            <div className="pl-4 border-l-2 border-ember-400">
              <p className="text-ink text-[17px] font-medium italic leading-snug">{result.whatMakesSpecial}</p>
            </div>
          )}

          {/* Verdict */}
          {result.verdict && (
            <div className="pl-4 border-l border-line-strong">
              <p className="text-ink-muted leading-relaxed text-sm italic">{result.verdict}</p>
            </div>
          )}

          {/* Performance specs */}
          {result.performanceSpecs?.engine && (
            <div className="bg-carbon-900/60 rounded-lg border border-line p-5">
              <SectionLabel>Performance Specs</SectionLabel>
              <p className="font-mono text-ink font-bold text-sm mb-5">{result.performanceSpecs.engine}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {result.performanceSpecs.powerKw > 0 && (
                  <div>
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Power</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">
                      {result.performanceSpecs.powerKw}kW
                      {result.performanceSpecs.powerHp > 0 && <span className="text-ink-faint font-normal"> / {result.performanceSpecs.powerHp}hp</span>}
                    </p>
                  </div>
                )}
                {result.performanceSpecs.torqueNm > 0 && (
                  <div>
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Torque</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">
                      {result.performanceSpecs.torqueNm}Nm
                      {result.performanceSpecs.torqueRpm && <span className="text-ink-faint font-normal"> @ {result.performanceSpecs.torqueRpm}rpm</span>}
                    </p>
                  </div>
                )}
                {result.performanceSpecs.zeroToHundred && (
                  <div>
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">0–100 km/h</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">{result.performanceSpecs.zeroToHundred}</p>
                  </div>
                )}
                {result.performanceSpecs.kerbWeightKg > 0 && (
                  <div>
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Kerb Weight</p>
                    <p className="font-mono text-ink font-bold text-sm tabular-nums">{result.performanceSpecs.kerbWeightKg}kg</p>
                  </div>
                )}
                {result.performanceSpecs.drivetrain && (
                  <div>
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-1">Drivetrain</p>
                    <p className="font-mono text-ink font-bold text-sm">{result.performanceSpecs.drivetrain}</p>
                  </div>
                )}
              </div>
              {result.performanceSpecs.jdmNote && (
                <p className="text-ember-300/80 text-xs mt-5 pt-4 border-t border-line leading-snug">{result.performanceSpecs.jdmNote}</p>
              )}
            </div>
          )}

          {/* Score chips — tap to scroll */}
          <div className="flex gap-2.5">
            <ScoreChip
              label="Investment"
              score={result.investmentScore ?? null}
              onClick={() => investmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
            <ScoreChip
              label="Character"
              score={characterScore}
              onClick={() => characterSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
            <ScoreChip
              label="Street Cred"
              score={result.vibeScore ?? null}
              onClick={() => streetCredSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          </div>

        </div>
      </Card>

      {/* ── SECTION 1: INVESTMENT ───────────────────────── */}
      <div id="investment" ref={investmentSectionRef} className="scroll-mt-4 space-y-4">
        <TileHeader index="01" label="Investment" score={result.investmentScore ?? null} quip={getQuip("investment", result.investmentScore ?? null)} />

        {/* Price Analysis */}
        {result.priceVerdict && (
          <div ref={priceVerdictRef} className="scroll-mt-4">
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
            <p className="font-mono text-ink-faint text-[10px] mt-2.5">Based on enthusiast market trends, not live pricing data.</p>
          </Card>
        )}

        {/* Wallet Damage Rating — stripe, arrows, and tint all derive from
            the same theme as the verdict badge so they can't disagree */}
        {result.worstFinancialDecision && (() => {
          const t = VERDICT_THEME_MAP[result.worstFinancialDecision.rating] ?? V_NEUTRAL;
          return (
            <div className="rounded-xl border border-line overflow-hidden" style={{ backgroundColor: t.bg }}>
              <div className="h-1" style={{ backgroundColor: t.border }} />
              <div className="p-6">
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
            </div>
          );
        })()}

        {/* Reliability Risk — issue borders carry the severity colour of the
            card's verdict badge, not the brand accent */}
        {result.ownershipPain && (() => {
          const t = result.ownershipPain.score >= 8 ? V_RED : result.ownershipPain.score >= 5 ? V_AMBER : V_GREEN;
          return (
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
          );
        })()}

        {/* Red flags — chrome follows the strongest flag present, so an
            all-conditional set doesn't shout in danger red */}
        {result.redFlags?.length > 0 && (() => {
          const anyConfirmed = result.redFlags.some((f) => !isConditional(f));
          return (
            <div
              className="rounded-xl overflow-hidden"
              style={
                anyConfirmed
                  ? { border: "1px solid rgb(239 68 68 / 0.5)", backgroundColor: "rgb(69 10 10 / 0.25)" }
                  : { border: `1px solid ${V_AMBER.border}`, backgroundColor: V_AMBER.bg }
              }
            >
              <div
                className="px-5 py-3 flex items-center gap-2.5"
                style={{ backgroundColor: anyConfirmed ? "#dc2626" : V_AMBER.border }}
              >
                <span className="text-white text-sm">⚠️</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                  {anyConfirmed ? "Red Flags — Read Before Buying" : "Worth Checking — Depends on the Variant"}
                </span>
              </div>
              <ul className="divide-y" style={{ borderColor: anyConfirmed ? "rgb(127 29 29 / 0.4)" : V_AMBER.border }}>
                {result.redFlags.map((f, i) => {
                  const cond = isConditional(f);
                  return (
                    <li key={i} className="px-5 py-4 flex gap-3">
                      <span
                        className="flex-shrink-0 text-base leading-tight mt-0.5"
                        style={{ color: cond ? V_AMBER.text : "#f87171" }}
                      >
                        ⚠
                      </span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: cond ? V_AMBER.text : "#fecaca" }}>
                          {f.flag}
                          {cond && <ConditionalTag />}
                        </p>
                        <p
                          className="text-xs mt-1 leading-relaxed"
                          style={{ color: cond ? `${V_AMBER.text}cc` : "rgb(252 165 165 / 0.8)" }}
                        >
                          {f.explanation}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
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
              <span className="font-mono text-xl font-bold text-ember-400 tabular-nums">
                {result.classicPotential.score}
                <span className="text-ink-faint text-xs font-normal">/10</span>
              </span>
            </div>
            {result.classicPotential.reasons?.length > 0 && (
              <ul className="space-y-2">
                {result.classicPotential.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-ink-muted leading-relaxed">
                    <span className="text-ember-600 flex-shrink-0">▸</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {/* ── SECTION 2: CHARACTER ────────────────────────── */}
      <div id="character" ref={characterSectionRef} className="scroll-mt-4 space-y-4">
        <TileHeader index="02" label="Character" score={characterScore} quip={getQuip("character", characterScore)} />

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
            <div className="space-y-0">
              <DriveScoreRow metric={result.drivingCharacter.steeringFeel} label="Steering" />
              <DriveScoreRow metric={result.drivingCharacter.engineCharacter} label="Engine" />
              <DriveScoreRow metric={result.drivingCharacter.dailyComfort} label="Daily" />
              <DriveScoreRow metric={result.drivingCharacter.overallFun} label="Fun" />
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
      <div id="street-cred" ref={streetCredSectionRef} className="scroll-mt-4 space-y-4">
        <TileHeader index="03" label="Street Cred" score={result.vibeScore ?? null} />

        {/* Owner Vibe */}
        {result.ownerVibe?.label && (
          <div ref={ownerVibeRef} className="scroll-mt-4">
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

        {/* Cars & Coffee + Community Credibility */}
        {(result.carsCoffee || result.communityCredibility) && (
          <Card className="p-6 space-y-5">
            {result.carsCoffee && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
                  <SectionLabel>Cars &amp; Coffee</SectionLabel>
                  <RatingBadge rating={result.carsCoffee.rating} />
                </div>
                <p className="text-ink-muted text-sm leading-relaxed">{result.carsCoffee.description}</p>
              </div>
            )}
            {result.carsCoffee && result.communityCredibility && (
              <div className="h-px bg-line" />
            )}
            {result.communityCredibility && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
                  <SectionLabel>Community Credibility</SectionLabel>
                  <RatingBadge rating={result.communityCredibility.rating} />
                </div>
                <p className="text-ink-muted text-sm leading-relaxed">{result.communityCredibility.description}</p>
              </div>
            )}
            {result.socialStanding && (
              <>
                <div className="h-px bg-line" />
                <p className="text-ink-muted text-sm italic leading-relaxed pl-3.5 border-l-2 border-ember-500/60">
                  {result.socialStanding}
                </p>
              </>
            )}
          </Card>
        )}

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
          <div className="flex items-center gap-3 pt-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Spec Significance</span>
            <div className="flex-1 h-px bg-line" />
          </div>
          <Card className="p-6">
            <ul className="space-y-3.5">
              {result.specSignificance.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-ember-400 flex-shrink-0 font-bold mt-0.5">+</span>
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
          <div className="flex items-center gap-3 pt-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Ask the Seller</span>
            <div className="flex-1 h-px bg-line" />
          </div>
          <Card className="p-6">
            <ol className="space-y-3.5">
              {result.questionsToAsk.map((q, i) => (
                <li key={i} className="flex gap-3.5 text-sm border-b border-line pb-3.5 last:border-0 last:pb-0">
                  <span className="font-mono text-ember-500 font-bold w-5 flex-shrink-0 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
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
          <div className="flex items-center gap-3 pt-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">You Might Also Consider</span>
            <div className="flex-1 h-px bg-line" />
          </div>
          <Card className="p-6 space-y-5">
            {result.alternatives.map((alt, i) => (
              <div key={i} className={i > 0 ? "pt-5 border-t border-line" : ""}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-bold text-ink text-sm leading-snug">{alt.name}</p>
                  {alt.priceRange && (
                    <span className="flex-shrink-0 font-mono text-[10px] font-medium text-ink-muted bg-white/[0.04] border border-line px-2.5 py-1 rounded whitespace-nowrap tabular-nums">
                      {alt.priceRange}
                    </span>
                  )}
                </div>
                <p className="text-ink-muted text-sm leading-relaxed">{alt.whySuited}</p>
                <p className="text-ink-faint text-xs leading-relaxed mt-1.5">{alt.howDiffers}</p>
                {/* New tab, so the app is still here when they come back */}
                <a
                  href={trademeSearchUrl(alt.name, alt.priceRange)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 min-h-10 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ember-400 hover:text-ember-300 transition-colors"
                >
                  Find on Trade Me <span aria-hidden="true">↗</span>
                </a>
              </div>
            ))}
            <p className="font-mono text-ink-faint text-[10px] leading-relaxed pt-3 border-t border-line">
              These are AI suggestions from general market knowledge, not listings we&apos;ve seen — each link runs a Trade Me search for that car, so what comes back is whatever&apos;s for sale today.
            </p>
          </Card>
        </div>
      )}

      {/* ── THE ENTHUSIAST TAKE ─────────────────────────── */}
      {result.enthusiastTake && (
        <div className="rounded-xl bg-carbon-900 border border-line-strong overflow-hidden">
          <div className="bg-ember-500 px-5 py-3 flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-carbon-950/50" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-carbon-950">
              The Enthusiast Take
            </span>
          </div>
          <div className="px-6 py-5">
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
            className="w-full border border-ember-600/50 hover:border-ember-500 disabled:border-line disabled:text-ink-faint text-ember-400 hover:text-ember-300 rounded-lg py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] transition-all"
          >
            {sharing ? "Building the link..." : "Share the Verdict"}
          </button>
          {shareNote && (
            <p className="font-mono text-[10px] text-ink-faint text-center">{shareNote}</p>
          )}
        </div>
      )}

    </div>
  );
}
