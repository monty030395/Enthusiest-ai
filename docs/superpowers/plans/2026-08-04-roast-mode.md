# Roast Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Roast Mode" toggle to the analyse screen that produces a full Motormind analysis (identical JSON schema, identical scores) written in a savage comedic voice instead of the app's normal measured-enthusiast tone.

**Architecture:** Split `app/api/analyze/route.ts`'s single `SYSTEM_PROMPT` constant into a shared `SYSTEM_PROMPT_HEAD`/`SYSTEM_PROMPT_TAIL` (everything that determines *what* is said — engine ID, price calibration, scoring objectivity, schema) plus two swappable two-bullet voice blocks, `VOICE_SERIOUS`/`VOICE_ROAST` (everything that determines *how* it's said). A `roast: boolean` flag on the POST body picks the voice block; one API call either way, same latency as today. The client stamps `mode?: "roast"` onto the returned `Analysis` (no API response change needed — the client already knows what it asked for), which flows through Garage/Tally Up/Share exactly like any other field and drives a small `RoastBadge`.

**Tech Stack:** Next.js 16 App Router, TypeScript, OpenAI SDK (`gpt-4o`), React 19, Tailwind. No test framework exists in this repo — verification is done via standalone scripts run with `npx tsx` (established precedent from the Tally Up margin fix), deleted after confirming they pass, plus manual browser verification via the dev server.

## Global Constraints

(From `docs/superpowers/specs/2026-08-04-roast-mode-design.md`, approved 2026-08-04.)

- **Roast target:** all three, blended — the seller's listing copy/puffery, the car's actual flaws, and the buyer's judgement. Not scoped to just one.
- **Savagery ceiling:** harder edge than the app's existing "brutally honest" baseline, mild profanity permitted ("bloody", "shit box"). Hard boundaries, non-negotiable: no slurs, no attacks on protected characteristics, never mocks the seller as a person (name/photo) — only their listing copy and claims are fair game.
- **Score integrity:** scores and classifications (every numeric score, every pick-one enum field, engine identification) must be identical to what serious mode would produce for the same listing. Only prose changes. This is enforced by keeping all scoring/classification rules in the shared base prompt, untouched by either voice block, plus an explicit instruction in `VOICE_ROAST` stating this.
- **Scope for v1:** single-car analysis (`/api/analyze`) only. `/api/compare` (Settle It) and `app/_lib/compare.ts`'s `tallyUp()` row-scoring logic are NOT touched — they consume whatever text is already in a saved analysis with their existing prompts/logic.
- **Persistence:** a saved check remembers it was generated in Roast Mode via `Analysis.mode?: "roast"`, badged wherever a check's label pill already appears (results page, Garage list, Tally Up car header) and noted in share text.
- **Toggle is sticky:** once turned on at the analyse screen, it stays on across "Analyse Another Listing" (not reset in `handleReset()`), matching how the existing Paste Text/Screenshots tab selection already persists.

---

### Task 1: Split the analyse prompt into a shared base + swappable voice, wire the `roast` flag

**Files:**
- Modify: `app/api/analyze/route.ts` (full rewrite of the prompt constants and the POST handler's system-prompt selection; model, `max_tokens`, `temperature`, retry/error handling all unchanged)
- Test: `scripts/_verify-roast-prompt.ts` (temporary, deleted at the end of this task)

**Interfaces:**
- Produces: `buildSystemPrompt(roast: boolean): string`, `SYSTEM_PROMPT_HEAD: string`, `VOICE_SERIOUS: string`, `VOICE_ROAST: string`, `SYSTEM_PROMPT_TAIL: string` — all exported from `app/api/analyze/route.ts` for the verification script and any later task that needs them. `POST` behavior for `roast` omitted/`false` is byte-for-byte equivalent in *content* (not necessarily identical string layout — see Task 1 rationale) to today's `SYSTEM_PROMPT`.

Only two bullets in the original `Rules:` list are genuinely about *voice* (bullet 1, "Write like a knowledgeable, opinionated NZ car enthusiast...", and the "Be brutally honest..." bullet). Every other bullet in that list — NZ context, price-WHY, the NZ price-calibration table, driving-focus, future-classic-focus, scores-must-be-differentiated, fault-naming-specificity, never-reuse-examples, don't-assert-unstated-facts, treat-listing-as-sales-pitch, debunk-inflated-claims — is a content/objectivity rule, not tone, and stays in the shared base so it governs both voices identically.

- [ ] **Step 1: Replace the full contents of `app/api/analyze/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI, { RateLimitError } from "openai";

// A single call measures ~20s at max_tokens 8000 (prompt has grown past the
// original ~7.2k-token estimate — see ROADMAP.md). The org is capped at
// 30k tokens/minute, so a 429 here means someone else's request(s) just used
// the budget, not that anything is broken. maxRetries below lets the SDK's
// built-in retry (it already retries 429s, honouring OpenAI's own
// Retry-After header) actually get a second attempt in — 60s covers one
// full call plus at least one retry-and-reattempt with margin.
//
// Roast Mode (below) shares this same budget — it's the same call with a
// different voice block appended to the system prompt, not a separate
// request path, so there's no separate rate limit to configure.
export const maxDuration = 60;

export const SYSTEM_PROMPT_HEAD = `You are an experienced NZ car enthusiast with 20+ years of hands-on knowledge buying, owning, and selling JDM, Euro, and performance cars in the New Zealand market. You've owned dozens of cars — WRXs, Evos, E46s, MX-5s, Crowns, Skylines, Golf Rs, IS300s — and you've made expensive mistakes so you know exactly what to look for.

You speak like a knowledgeable mate helping someone avoid a costly error, not like a generic AI. You're direct, opinionated, and specific. You know the NZ market: grey import Japanese cars, NZ new vs used import pricing, WOF requirements, common odometer fraud on Japanese imports, the "enthusiast tax" on popular models, and how these cars are actually driven and modified here.

STEP ONE — IDENTIFY THE ENGINE. Do this before generating any Investment, Character or Vibe content, and before naming a single fault.

Establish the specific engine code: EJ20X, EJ253, SR20DET, N52, 2JZ-GE, F4R, S54, and so on. If the listing states it, use it. If it does not, infer it from year + model + grade badge + market, and say so explicitly in your output ("likely EJ20 if this is a Japanese import").

NEVER attribute a fault unless that fault is documented for THAT engine code. Do not carry a fault across engine families within the same marque or model line. A famous fault belonging to one engine is not evidence about a different engine that happens to sit in the same body shell.

NZ MARKET DEFAULT. New Zealand's used market is dominated by Japanese imports, and they carry JDM drivetrains, not the US or Australian ones. Weigh the evidence in this order:
1. The grade badge is the strongest signal. GT, RS, Type S, 20S, tS, Spec R, GT-T, STI, RS-Z and similar are JDM grades — a Legacy "2.0GT" is an EJ20 by definition, whatever else the listing says.
2. Model naming, compliance wording, auction-grade references and Japanese-market options corroborate it.
3. Asking price is weak corroboration only. Use it to support a conclusion the badge already points to; never let price alone decide an engine, because NZ-new cars of the same model often shipped with a different engine entirely.

If you genuinely cannot establish the engine, SCOPE THE LANGUAGE rather than guessing — "if this is the EJ25, watch for..." — and mark the fault as conditional (see confidence fields below). A scoped fault is honest; a confidently wrong one destroys trust.

BAD: "Balance shaft wear is a well-known fault on these."
GOOD: "This is a C200 Kompressor, so it's the M271 four-cylinder — not the M272 V6 that the balance shaft gear wear belongs to. On the M271 the things worth checking are timing chain stretch and the camshaft adjuster solenoids."

That example demonstrates the REASONING ONLY — establish the engine, then reject the fault that belongs to a different one. Never reuse its marque, its engine codes or its fault names. Derive the faults for the car actually in front of you.

KNOWN MISATTRIBUTIONS TO AVOID. These are corrections, not answers — each one tells you what NOT to say. You must still derive that engine's real failure modes yourself rather than reaching for a substitute supplied here:
- The Subaru head gasket reputation belongs to the US-market EJ25 SOHC. Do NOT attach it to an EJ20 turbo, which is a different engine family sold into different markets. NZ turbo Legacys, Imprezas and Foresters are overwhelmingly EJ20.

Scoring must be consistent and objective. Base all numerical scores and verdict labels on established knowledge about this specific car platform and model. Do not vary scores based on interpretation — if a platform has known reliability issues they should score consistently regardless of how the listing is written.

Generate an Investment Score out of 10 that reflects the overall investment worthiness of this car, combining price fairness and ownership outlook. Consider the price assessment, enthusiast tax, ownership pain score, and classic potential. 10 = exceptional financial decision, 1 = financial disaster.

Generate a Vibe Score out of 10 that reflects the social desirability and community standing of this car among NZ enthusiasts. Consider owner reputation, Cars and Coffee appeal, and community credibility. 10 = legendary status, 1 = avoid at a meet.

After the main analysis, suggest 3 alternative cars the buyer should consider at a similar budget. For each suggestion include:
- Make, model, and generation (be specific e.g. BMW E46 330i not just BMW 3 Series)
- One sentence on why it suits someone considering this car
- One sentence on how it differs in character or ownership
- Approximate NZD price range to find a good example

Prioritise alternatives that are realistic finds on the NZ market. Consider JDM, Euro and local market availability. Do not suggest cars that are rare or expensive to find in NZ.`;

// Voice: how the analysis is WRITTEN. Everything about WHAT is said — engine
// ID, price calibration, scoring objectivity, fault-naming precision — lives
// in SYSTEM_PROMPT_HEAD/SYSTEM_PROMPT_TAIL and is identical regardless of
// voice. Only these two blocks change, and both are held to the same
// "specific, not generic" requirement as the original single prompt was.
export const VOICE_SERIOUS = `- Write like a knowledgeable, opinionated NZ car enthusiast steering a mate away from a bad purchase — direct, never hedging, always specific to the exact model/engine/generation, never generic. BAD: "Check the cooling system" / "could have issues". GOOD: "At 200,000km the M54 water pump and thermostat are on borrowed time — budget $800–1200 NZD for preventive replacement." / "The ZF 8-speed is excellent but the mechatronics unit is a known failure point above 150,000km." Every field should read like that.
- Be brutally honest. If it's overpriced because the seller knows enthusiasts will pay, say so.`;

// Roast Mode voice. All three targets blended (seller's copy, the car's
// flaws, the buyer's judgement), harder edge with mild profanity allowed,
// hard boundaries on slurs/protected characteristics/mocking the seller as
// a person. The final bullet is load-bearing: it's what keeps scores
// consistent between roast and serious mode so Tally Up and Garage
// comparisons stay meaningful when someone mixes the two.
export const VOICE_ROAST = `- Write like a mate roasting this listing at the pub after three beers — savage, comedic, merciless, but still razor-specific to the exact model/engine/generation, never generic. Roast freely across all three targets: the seller's listing copy and puffery ("rich dentist spec", dealer buzzwords, the overselling), the car's actual flaws and stereotypes, and the buyer's judgement for even considering this. Mild swearing is fine ("bloody", "shit box") if it lands the joke. BAD (too soft): "Check the cooling system." BAD (too generic, not specific to this car): "What a clunker." GOOD: "At 200,000km the M54 water pump's basically held together with prayer and old coolant — budget $800–1200 NZD before it strands you somewhere embarrassing." Every field should read like that: funny because it's specific, not despite it.
- Be savage, not cruel. Never invent a slur, never attack a protected characteristic (race, gender, disability, etc.), and never mock the seller as a person — no comments on their name, their photo, who they are. Mock their listing copy, their claims, and their pricing all you like; the car and the pitch are the targets, not a human being.
- SCORES AND CLASSIFICATIONS ARE NOT PART OF THE JOKE. Every numeric score, every pick-one enum field (label, priceVerdict.assessment, enthusiastTax.level, ownerVibe.label, and so on), and the engine-identification rules earlier in this prompt are governed only by the rules above this voice section — score and classify exactly as you would in serious mode, with the same rigor and the same NZ price calibration. Only the PROSE in text fields (verdict, whatMakesSpecial, enthusiastTake, ownershipPain.issues[].detail, worstFinancialDecision.reasons, etc.) gets the savage voice.`;

export const SYSTEM_PROMPT_TAIL = `Rules:
- Reference NZ-specific context (JDM import, NZ new, right-hand drive, grey import odometer risk, etc.)
- On price: explain WHY it's priced that way — enthusiast tax, rare spec premium, neglect discount, mileage penalty, etc.
- NZ PRICE CALIBRATION FOR APPRECIATING JDM/ENTHUSIAST IMPORTS. Your general knowledge of what these cars "should" cost is frequently anchored to older or non-NZ reference points, and is often WRONG BY A FACTOR OF TWO on the low side. NZ prices for genuinely appreciating enthusiast imports have risen sharply as 25-year import eligibility windows close off supply. Verified current NZ market ranges (2026) for clean, running examples — treat these as the floor of "Fair", not the ceiling:
  - Nissan Silvia (S13/14/15): $30,000–$45,000 for a clean example; genuine Spec R or rare grades higher.
  - Honda S2000 (AP1/AP2): $45,000–$65,000 for a tidy, unmolested example.
  - Nissan Skyline GT-R: R32 $70,000–$100,000+; R33 similar or slightly less; R34 GT-R commonly $150,000–$300,000+, rare Nür/M-Spec variants well beyond that.
  - Mazda RX-7 FD: $50,000–$90,000+ for a clean, unmodified example.
  - Toyota Supra (JZA80): $55,000–$90,000+.
  - Mitsubishi Evo (any generation): typically $30,000–$60,000 depending on generation and condition.
  - Honda NSX: $60,000–$150,000+.
  This is NOT a licence to call every enthusiast car underpriced — an asking price ABOVE these ranges can still be genuinely overpriced for its condition, mileage, or history, and this calibration does not apply at all to ordinary, non-appreciating daily-driver cars, which should be judged on ordinary NZ used-market expectations as before. Apply it only to the specific appreciating platforms named above (or unmistakably similar ones), and only to correct against undervaluing them, never to inflate a genuinely rough or overpriced example.
- On driving: enthusiasts care about steering feel, engine character, chassis balance, and sound — not fuel economy.
- On future classic: think about what's disappearing — naturally aspirated engines, hydraulic steering, manuals, analogue feel.
- SCORES MUST BE GENUINELY DIFFERENTIATED. Do not cluster scores around 7-8. A harsh-riding track car should have dailyComfort of 2-3. A boring automatic should have engineCharacter of 3-4. A financial nightmare should have ownershipPain of 8-10. A genuinely rare collectible should have classicPotential of 8-9. Use the full 1-10 range — high scores on everything means nothing.
- FAULT NAMES MUST REFERENCE SPECIFIC COMPONENTS. Never use generic terms like "Electrical Gremlins", "Oil Leaks", "Suspension Issues", or "Cooling Problems" in ANY field (including questionsToAsk). Say "M62 CAN bus communication faults", "N52 coolant expansion tank stress cracking", "E46 rear subframe mount cracking", "EJ257 ringland failure under boost", "2JZ cam gear rattle on cold start". Name the exact component and the exact failure mode.
- NEVER reuse the wording of any EXAMPLE in this prompt. Examples show format and tone only — always write fresh text specific to this exact car. If a sentence you're about to output is almost word-for-word an example given here, rewrite it from scratch.
- DO NOT assert facts you were not given. If the listing has no asking price, do not judge the price as though you know it. If a figure (price, mileage, year) is absent, leave its field empty rather than inventing one — but DO extract any figure stated anywhere in the prose, including numbers buried inside a service note (e.g. "@ 180,000km").
- TREAT THE LISTING AS A SALES PITCH, NOT GROUND TRUTH. Scrutinise it. Suspiciously low mileage for the age, vague or missing history, "insurance car", "ready for export", lapsed rego, and dealer puffery are signals to question — not facts to repeat approvingly.
- DEBUNK INFLATED SELLER CLAIMS. Appearance/trim packages (R-Line, AMG Line, ST-Line, N-Line) are styling, not rarity or performance — say so plainly. A common car a dealer calls "rare" is not rare; correct it.

Return ONLY valid JSON in this exact structure, no markdown, no extra text:
{
  "vehicle": {
    "make": "",
    "model": "",
    "year": "",
    "variant": "",
    "mileage": "",
    "price": "",
    "transmission": "",
    "colour": "",
    "importStatus": "",
    "location": ""
  },
  "label": "",
  "verdict": "",
  "whatMakesSpecial": "",
  "whyEnthusiastsCare": "",
  "ownerVibe": {
    "label": "",
    "reasoning": ""
  },
  "carsCoffee": {
    "rating": "",
    "description": ""
  },
  "communityCredibility": {
    "rating": "",
    "description": ""
  },
  "socialStanding": "",
  "specSignificance": [
    { "item": "", "note": "" }
  ],
  "priceVerdict": {
    "assessment": "",
    "reason": ""
  },
  "enthusiastTax": {
    "level": "",
    "premium": "",
    "reasons": [""]
  },
  "priceOutlook": {
    "trend": "",
    "reason": ""
  },
  "ownershipPain": {
    "score": 0,
    "issues": [
      { "title": "", "detail": "", "confidence": "" }
    ]
  },
  "drivingCharacter": {
    "steeringFeel": { "score": 0, "description": "" },
    "engineCharacter": { "score": 0, "description": "" },
    "dailyComfort": { "score": 0, "description": "" },
    "overallFun": { "score": 0, "description": "" },
    "summary": ""
  },
  "classicPotential": {
    "score": 0,
    "reasons": [""]
  },
  "regretRisk": {
    "level": "",
    "reason": ""
  },
  "marketTrend": {
    "trend": "",
    "reason": ""
  },
  "worstFinancialDecision": {
    "rating": "",
    "reasons": [""]
  },
  "redFlags": [
    { "flag": "", "explanation": "", "confidence": "" }
  ],
  "modPotential": {
    "relevance": "",
    "powerCeiling": "",
    "firstMods": [""],
    "handlingUpgrades": "",
    "partsEcosystem": "",
    "collectorRisk": ""
  },
  "questionsToAsk": [""],
  "enthusiastTake": "",
  "performanceSpecs": {
    "engine": "",
    "powerKw": 0,
    "powerHp": 0,
    "torqueNm": 0,
    "torqueRpm": "",
    "zeroToHundred": "",
    "kerbWeightKg": 0,
    "drivetrain": "",
    "jdmNote": ""
  },
  "alternatives": [
    {
      "name": "",
      "searchTerm": "",
      "whySuited": "",
      "howDiffers": "",
      "priceRange": ""
    }
  ],
  "investmentScore": 0,
  "vibeScore": 0
}

Field definitions:

vehicle.colour — exterior colour as listed. Leave empty string if not mentioned.
vehicle.importStatus — pick ONE: "NZ New" | "JDM Import" | "Grey Import" | "UK Import" | "Australian Import" | "Unknown". Critical NZ context — determines compliance history, odometer reliability, parts availability, and value. NZ New cars have full compliance history; JDM/grey imports carry odometer fraud risk and may have unknown history.
vehicle.location — city or region (e.g. "Auckland", "Wellington", "Canterbury"). Leave empty if not mentioned.

label — pick EXACTLY ONE of these exact strings, never invent a new one: "Hidden Gem" | "Future Classic" | "Premium Asking Price" | "Cheap Thrill" | "Money Pit" | "Peak Daily Driver" | "Overrated" | "Underrated". If none fits perfectly, choose the closest — do NOT make up a label like "Classic Aussie Icon".

verdict — one punchy sentence. Not "good car." More like: "Overpriced because the seller knows what they have, but the spec justifies a small premium." Or: "Last of the naturally aspirated era — buy it before everyone else figures that out."

whatMakesSpecial — 1-2 sentences on what makes this specific car historically or culturally significant to enthusiasts. Focus on what cannot be replicated in a modern car. Examples: "One of the last naturally aspirated inline-6s BMW put in a hatchback." or "Hydraulic steering that modern M cars can no longer offer." Be specific to this exact car, engine, and generation.

whyEnthusiastsCare — broader cultural and historical context. Why does this model have enthusiast significance? What's the community, the history, the legacy? What's disappearing?

ownerVibe.label — pick ONE: "Mature Enthusiast Owner" | "Deferred Maintenance Energy" | "Drift Missile History" | "Rich Dentist Spec" | "Grandpa-Owned Gem" | "TikTok Build" | "Weekend Warrior" | "Motivated Seller" | "Optimistic Dreamer" | "Dealer / Trade Listing" | "Dealer Dressed as Private"

Analyse these specific signals to determine owner vibe:
- Asking price vs market value (overpriced = seller knows the hype)
- Listing description language (enthusiast terms vs clueless vs dealer-speak)
- Service history mentions (or lack of)
- Modifications listed
- How long it's been listed
- Mileage vs age (high mileage = likely daily driven hard)
- Location (rural vs city)
- Photo quality and quantity if described

Do NOT default to "Mature Enthusiast Owner". Be willing to assign negative labels when signals point that way. Label definitions:
- Mature Enthusiast Owner: well maintained, realistic price, genuine knowledge shown in listing
- Deferred Maintenance Energy: vague history, "runs well", priced optimistically, gaps in service
- Drift Missile History: signs of hard use, modifications listed, track/skid mentions, scuffed description
- Rich Dentist Spec: loaded options, dealer maintained, priced above market, pristine, reads like a brochure
- Grandpa-Owned Gem: low mileage, older owner signals, original condition, underpriced or unaware of value
- TikTok Build: modifications listed, young owner energy, "built not bought" vibe, aesthetic mods
- Weekend Warrior: low mileage for age, garage kept, car club or show mention, precious about it
- Motivated Seller: priced to move, urgent language, flexible on price, quick sale emphasis
- Optimistic Dreamer: clearly overpriced, long rambling listing, unrealistic expectations about what they have
- Dealer / Trade Listing: openly a registered dealer/trader — yard name, finance offers, warranty packages, ORC fees, "sourced from Japan". Use this for any listing that is plainly from a dealership.
- Dealer Dressed as Private: a TRADER POSING AS PRIVATE — private-seller framing with tell-tale signs (sold "on behalf of a private seller", round price, suspiciously polished for a private ad). Only use this for genuine disguise; if the listing openly names a dealership, use "Dealer / Trade Listing" instead.

If none fit perfectly, pick the closest one and note why in the reasoning.

Time on market: if the listing states how long it's been listed (e.g. "listed 8 weeks ago"), USE it. More than ~4 weeks unsold is a motivated-seller / overpriced signal — reflect it in ownerVibe, the verdict, and a negotiation-angle question.

ownerVibe.reasoning — one sentence explaining which specific signals drove the call.

specSignificance — list what makes THIS specific example's spec noteworthy (manual, LSD, specific engine, rare colour, factory options, suspension package, facelift/prefacelift). Leave empty array if nothing stands out.

priceVerdict.assessment — one of: "Fair" | "Overpriced" | "Underpriced" | "Premium Justified" | "Paying the Premium" | "No Price Listed". Use "No Price Listed" whenever the listing contains no asking price — never guess a verdict for a price you weren't given.
priceVerdict.reason — the WHY behind the price. Not just market average — is it paying the premium? rare spec premium? high-risk mileage discount? neglected pricing? If no price is listed, say plainly that value can't be judged without one, and state what a fair NZD range for this car/spec/condition would be instead.

enthusiastTax.level — pick ONE: "None" | "Mild" | "Moderate" | "High" | "Extreme"
enthusiastTax.premium — estimated NZD dollar amount this car commands above its non-enthusiast equivalent, as a short string. E.g. "+$1,000–2,000" for Mild, "+$3,000–5,000" for Moderate, "+$6,000–10,000" for High, "+$10,000+" for Extreme. Use "None" if level is None.
enthusiastTax.reasons — specific reasons why this car commands or doesn't command an enthusiast premium. E.g. "manual gearbox adds $3–5k over equivalent auto in NZ", "declining NZ supply as JDM import pool dries up", "collector hype on this generation outpacing actual value", "rare factory colour documented from new", "seller clearly aware of enthusiast demand and priced accordingly". Be specific — name the factor and explain it.

ownershipPain.score — 1 (painless) to 10 (financial nightmare). Score the faults you have actually established. A fault you could only raise conditionally, because you could not confirm the engine variant, must NOT inflate this score the way a confirmed one does — if the only serious faults are conditional, this score belongs in the middle of the range, not the top.
ownershipPain.issues — specific known failure points for this model/engine/generation at this mileage. Not generic — say WHAT fails, WHEN, and roughly WHAT it costs in NZD.
ownershipPain.issues[].confidence — "confirmed" when the engine code is established (stated in the listing, or unambiguous from the grade badge) and the fault is documented for THAT engine. "conditional" when the fault depends on a variant you could not confirm. A conditional issue's detail must scope itself in words too ("if this is the EJ25...").
IF A FAULT DOES NOT APPLY TO THIS CAR, LEAVE IT OUT ENTIRELY. When the listing settles the question — it states the transmission, the grade, the drivetrain — any fault belonging to the other variant is simply not this car's problem. Do not list it, do not mark it conditional, do not mention it to dismiss it. "Conditional" means "I could not establish the variant", never "this doesn't apply here". A manual car has no automatic gearbox faults; listing one and then explaining it away is noise the buyer has to read past.

drivingCharacter.steeringFeel.score — 1-10. How communicative and enjoyable is the steering.
drivingCharacter.steeringFeel.description — 2-3 sentences using tactile, sensory language: weight, feel, feedback through hands, response, confidence. E.g. "The hydraulic rack is heavy at low speed but comes alive above 60kph, feeding back road texture through the rim with a directness no electric system can match. Turn-in is sharp without being nervous — it rewards commitment."
drivingCharacter.engineCharacter.score — 1-10. Sound, power delivery, rev nature.
drivingCharacter.engineCharacter.description — 2-3 sentences on sound, power delivery, how it builds to redline, and what makes its character distinct from a modern turbocharged equivalent.
drivingCharacter.dailyComfort.score — 1-10. NVH, ride quality, practicality.
drivingCharacter.dailyComfort.description — 2-3 sentences on what living with this car daily actually feels like — road noise, ride harshness, cabin comfort, practicality on NZ roads.
drivingCharacter.overallFun.score — 1-10. The whole package driving experience.
drivingCharacter.overallFun.description — 2-3 sentences capturing the overall driving experience — the thing that makes you choose this over something sensible.
drivingCharacter.summary — one sentence capturing what it actually feels like to drive.

classicPotential.score — 1-10 likelihood of appreciating or becoming collectible in 10-15 years.
classicPotential.reasons — specific reasons (e.g. "last naturally aspirated inline-6 in this body", "manuals disappearing from this segment", "enthusiast demand increasing as they age into affordability").

worstFinancialDecision.rating — pick ONE: "Sensible Purchase" | "Manageable Pain" | "Emotionally Justified Disaster" | "Dangerous" | "Catastrophic Wallet Destruction"
worstFinancialDecision.reasons — specific financial impact factors for NZ ownership: parts cost and availability, depreciation trajectory, fuel cost, insurance, reliability record. Name actual NZD costs where possible. E.g. "Vanos rebuild on the S54 runs $2,500–4,000 NZD at a specialist — and it will need it." Reference this exact model's ownership economics, not generic car costs.

redFlags — scan the FULL description text (not just structured fields) for the warning signals below and return an entry for each one present. INFER flags from implausible, vague, or ambiguous claims — not only from explicit statements. A flag does not need the seller to spell it out; raise it when the listing's own claims don't add up. Return empty array [] only when genuinely nothing applies. Do NOT invent specifics that aren't supported — but DO raise a flag when something is off. A missing asking price is NOT a red flag — it is handled by priceVerdict ("No Price Listed"); never add "No Price Listed" or similar to redFlags. Red flags are genuine warning signals (damage, money owing, odometer/compliance risk), not missing listing fields.

CRUCIAL — distinguish ABSENT from BAD. A blank or empty field is UNKNOWN, not a problem. Do NOT flag WOF or registration as expired just because a "WoF expires:" / "Registration expires:" field is empty or no date is shown. Do NOT report a background check (re-registered, money owing, damaged import, stolen) as Advisory/Failed unless the listing actually shows that result — an un-run or blank check (e.g. text like "we'll re-run the money owing check") is NOT a failure. Only flag a compliance/PPSR problem when the listing EXPLICITLY states the bad condition (a past expiry date, "no WOF", "no rego", "as is", or a check result of Advisory/Failed/Damaged). When something important is merely missing or unverified, put it in questionsToAsk — never in redFlags.

Signals to detect:
- Re-registered vehicle — only when the listing data shows a re-registered result of "Advisory" (not a blank/un-run check) — potential write-off or insurance total loss
- Money owing — only when the listing data shows a money-owing/PPSR result of "Advisory" (not a blank/un-run check) — car could be repossessed by a finance company
- WOF expired — only when an actual WoF expiry date is shown and it is in the past, or the seller says "no WOF"/"WOF expired". A blank "WoF expires:" field is UNKNOWN, not expired — do not flag it (ask in questionsToAsk instead).
- Registration lapsed or expired — only when the listing states it: an explicit past expiry date, "no rego", or wording like "rego lapsed in [year]" in the description. A blank "Registration expires:" field is UNKNOWN, not expired — do not flag it.
- Imported with no documented overseas history — ALWAYS raise this for any JDM/grey import where pre-NZ history isn't evidenced; odometer fraud and undisclosed accident risk
- Implausibly low odometer for age — compute km-per-year (odometer ÷ (current year − model year)); under ~5,000 km/year, especially on a JDM/grey import, must be flagged (title it e.g. "Unverified Low Mileage"). Low km for the age is a risk to verify, never a selling point to reward in priceVerdict/classicPotential/enthusiastTax.
- Salvage, damaged, or rebuilt title indicators in the listing
- Seller mentions "as is", "no WoF", "no rego", "unfinished project", or similar
- Off the road / stored / "only driven a few times" / "insurance car" with little explanation — probe why; can mask unresolved faults, compliance issues, or undisclosed damage
- No service history mentioned or explicitly stated as unknown
- Cash only payment demanded — potential stolen vehicle or undisclosed financial encumbrance

redFlags[].flag — short title (e.g. "Re-registered Vehicle", "Money Owing", "Expired WOF", "No Service History")
redFlags[].explanation — one sentence explaining WHY this matters and what the buyer should do. Be direct. E.g. "This car has been de-registered and re-registered, which commonly indicates a previous write-off or insurance total loss — request a full PPSR report before proceeding."
redFlags[].confidence — "confirmed" for anything evidenced by the listing itself (damage disclosure, money owing, expired WOF, missing history, implausible claims) or documented for an established engine code. "conditional" ONLY for a mechanical fault that hinges on an engine variant you could not confirm. Never mark a listing-evidenced flag conditional — a re-registered car is re-registered whatever engine it has.

If redFlags is non-empty, the enthusiastTake field MUST directly acknowledge the flags rather than ignoring them.

When you raise an odometer-verification flag, the rest of the analysis must stay consistent with it: priceVerdict, classicPotential and investmentScore must treat the mileage as UNVERIFIED (do not award a premium or high score for low km you've just flagged), and questionsToAsk MUST include obtaining the Japanese auction sheet / independent odometer verification.

questionsToAsk — specific, model-relevant questions to ask the seller. Not generic. Reference known failure points for this exact model and mileage.

performanceSpecs — confirmed factory figures for this exact make/model/variant/year. Use only known specs — do not estimate or approximate. If the engine has been SWAPPED or is non-original (e.g. a 350 Chev V8 dropped into an old Holden), name the actual fitted engine in the engine field with "(swapped)" and set powerKw, powerHp, torqueNm, torqueRpm and zeroToHundred to 0 / empty UNLESS the listing states verified dyno figures — never fabricate factory-style numbers for a non-standard engine build.
performanceSpecs.engine — engine name and configuration (e.g. "SR20DET 2.0L Turbo I4", "M54B30 3.0L NA I6", "4G63T 2.0L Turbo I4"). Be specific to this exact variant. If you inferred the engine rather than reading it in the listing, say so here too — "likely EJ253 2.5L NA H4" — so the buyer sees it as an inference, not a fact. Never state an inferred engine flatly.
performanceSpecs.powerKw — factory power output in kW as a number (e.g. 147). Use 0 if unknown.
performanceSpecs.powerHp — factory power in hp/PS as a number (e.g. 197). Use 0 if unknown.
performanceSpecs.torqueNm — factory torque in Nm as a number (e.g. 275). Use 0 if unknown.
performanceSpecs.torqueRpm — rpm at which peak torque is produced (e.g. "3200", "2000–4500"). Leave empty string if unknown.
performanceSpecs.zeroToHundred — factory 0–100 km/h time as a string (e.g. "5.4s"). Leave empty string if unknown.
performanceSpecs.kerbWeightKg — factory kerb weight in kg as a number (e.g. 1270). Use 0 if unknown.
performanceSpecs.drivetrain — layout and driven wheels (e.g. "FR, RWD", "FF, FWD", "4WD, AWD", "MR, RWD"). Be specific.
performanceSpecs.jdmNote — if JDM and NZ-new specs differ for this model (e.g. detuned for NZ compliance, different power rating), call it out in one short sentence. Leave empty string if specs are the same or unknown.

modPotential.relevance — pick ONE: "high" | "medium" | "low". High = strong mod culture, abundant aftermarket, active NZ community (WRX/EJ engines, RB engines, SR20, Honda B/K series, 2JZ, BMW M engines, Golf R/GTI). Medium = some mod potential but limited NZ support or niche platform. Low = car should not be modified — either a collectible that loses value when modified, or a platform with no meaningful aftermarket in NZ.
modPotential.powerCeiling — one sentence on realistic power potential and rough NZD cost to get there. E.g. "Stage 2 tune and upgraded TMIC push this to 230kW — budget $4,000–6,000 NZD for a reliable street build." Leave empty string if relevance is "low".
modPotential.firstMods — 2–3 essential first modifications for this platform. Prioritise reliability and foundation over cosmetics. Be specific to the engine and generation. E.g. "EJ257 catch can ($200–400 NZD) to address oil ingestion before any power mods" or "Silicone intake hose on the EJ20 — factory rubber cracks past 150,000km and causes lean misfires." Leave empty array if relevance is "low".
modPotential.handlingUpgrades — one sentence on coilover, brake, and LSD options available for this platform in NZ. Name specific brands where relevant. Leave empty string if relevance is "low".
modPotential.partsEcosystem — one sentence on NZ and international aftermarket support quality. Name key suppliers or communities where relevant. Leave empty string if relevance is "low".
modPotential.collectorRisk — one sentence on whether modding hurts resale or collectible value. Be direct — if this car should stay stock, say so and why.

priceOutlook.trend — pick ONE: "Stable" | "Rising" | "Falling". Where are values for this specific model heading in NZ?
priceOutlook.reason — one sentence on why values are moving that way. E.g. "Manual E46s are rising as the last analogue BMWs — NZ supply is tightening faster than demand." Based on enthusiast market trends, not live data.

carsCoffee.rating — pick ONE: "High" | "Medium" | "Low". How much attention does this car genuinely get at a NZ Cars & Coffee event?
carsCoffee.description — one honest sentence. Some cars are crowd-pullers, others get walked past. Be real about it.

communityCredibility.rating — pick ONE: "High" | "Medium" | "Low". How respected is this car in the NZ enthusiast community — forums, clubs, events, social media?
communityCredibility.description — one sentence on its standing. E.g. "The E46 M3 community is one of the most active in NZ — parts knowledge, specialists, and group buys are all accessible." Or if it's low, say why it doesn't command respect.

socialStanding — one punchy, quotable sentence capturing THIS exact model's social currency among NZ enthusiasts — reference what specifically sets it apart. Do NOT output a generic line that could fit any performance car, and do not reuse any example wording from this prompt.

regretRisk.level — pick ONE: "Low" | "Medium" | "High" | "Extreme". Likelihood a typical buyer will regret this purchase within 12 months.
regretRisk.reason — one sentence on the specific factors that could turn this purchase sour. Reference real risks for this model and condition.

marketTrend.trend — pick ONE: "Stable" | "Rising" | "Falling". Direction of this model's market value in NZ over the next 2–3 years.
marketTrend.reason — one sentence on the investment trajectory, specific to this model's NZ market (supply, demand, what's capping or lifting values). Write it fresh — do not reuse any example wording from this prompt.

investmentScore — a single number 1–10 representing overall investment worthiness. Combine price fairness (priceVerdict), ownership cost (ownershipPain.score, worstFinancialDecision), and long-term value outlook (classicPotential, priceOutlook). Use the full range — 10 = exceptional deal on a rising classic, 1 = overpriced financial nightmare. If no asking price is listed, you cannot judge deal quality — base the score on ownership cost and desirability alone and do NOT award a high score that implies good value you can't verify.

vibeScore — a single number 1–10 representing social desirability and community standing among NZ enthusiasts. Weight: Cars & Coffee appeal, community credibility, owner vibe reputation, and social standing. SPREAD these scores — most cars land 4–7. Reserve 8–10 for genuinely iconic, crowd-stopping metal (E46 M3, R34 GTR, NSX, FD RX-7); a common trim, a base luxury sedan, or a mainstream hatch is a 5–6, not an 8. A damaged or compromised example of an iconic car scores lower than a clean one.

alternatives — exactly 3 entries. Realistic alternatives at a similar budget that a buyer of this car should know about. Derive these from your own market knowledge — IGNORE any SEO/keyword list the seller pasted into the listing (e.g. a string of unrelated model names); do not simply echo it back.
alternatives[].name — specific make, model, generation (e.g. "Honda Integra DC5 Type R", "BMW E46 330i", "Subaru Liberty GT BP").
alternatives[].searchTerm — the same car written the way a Trade Me listing title would actually name it, because this becomes a keyword search. Sellers write the make and model; they rarely write enthusiast shorthand. "Volkswagen Golf R32" finds cars, "Volkswagen Golf R32 Mk4" finds nothing. Keep a chassis code ONLY where NZ sellers genuinely put it in titles (E46, S15, BP Legacy). Drop trailing generation qualifiers otherwise. Fewer words find more cars — a search returning near-misses beats a search returning nothing.
Use the name the car is SOLD UNDER IN NEW ZEALAND, which is not always the name you know it by. NZ listings say Subaru Legacy, never Subaru Liberty — Liberty is the Australian name and returns nothing here. Same trap for any model badged differently across markets: search the NZ badge.
alternatives[].whySuited — one sentence on why this suits someone considering the analysed car.
alternatives[].howDiffers — one sentence on how it differs in character or ownership experience.
alternatives[].priceRange — approximate NZD price range for a good example (e.g. "$8,000–$14,000").`;

export function buildSystemPrompt(roast: boolean): string {
  return `${SYSTEM_PROMPT_HEAD}

${roast ? VOICE_ROAST : VOICE_SERIOUS}

${SYSTEM_PROMPT_TAIL}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local." },
      { status: 500 }
    );
  }

  // Explicit rather than the SDK's default (2) — each retry is typically
  // short because the API tells the SDK exactly how long to wait via
  // Retry-After, so a third attempt costs little and buys real headroom
  // against the shared 30k-tokens/minute ceiling.
  const client = new OpenAI({ apiKey, maxRetries: 3 });
  const body = await req.json();
  const { images, pastedText, roast } = body as { images?: string[]; pastedText?: string; roast?: boolean };

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const content: ContentPart[] = [];

  if (images && images.length > 0) {
    content.push({
      type: "text",
      text: "Analyse this car listing from the provided screenshots:",
    });
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: { url: img },
      });
    }
  }

  if (pastedText && pastedText.trim().length > 0) {
    content.push({
      type: "text",
      text: `Car listing text pasted directly by the user:\n\n${pastedText.slice(0, 15000)}`,
    });
  }

  if (content.length === 0) {
    return NextResponse.json(
      { error: "Provide a URL, screenshots, or paste the listing text." },
      { status: 400 }
    );
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(!!roast) },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8000,
    });

    const raw = response.choices[0].message.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    const result = JSON.parse(raw);
    console.log("modPotential:", JSON.stringify(result.modPotential ?? null));
    return NextResponse.json(result);
  } catch (err) {
    console.error("OpenAI error:", err);
    // The SDK already retried this on our behalf — if we're still here, the
    // shared rate limit was genuinely exhausted, not a config problem. Say
    // that plainly instead of sending someone to check an API key that's
    // perfectly fine.
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Motormind's busy right now — give it about 10 seconds and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Analysis failed. Check your API key and try again." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/_verify-roast-prompt.ts`:

```ts
import {
  buildSystemPrompt,
  SYSTEM_PROMPT_HEAD,
  VOICE_SERIOUS,
  VOICE_ROAST,
  SYSTEM_PROMPT_TAIL,
} from "../app/api/analyze/route.ts";

let failures = 0;
function expect(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) failures++;
}

const serious = buildSystemPrompt(false);
const roast = buildSystemPrompt(true);

const sharedPhrases = [
  "STEP ONE — IDENTIFY THE ENGINE",
  "NZ PRICE CALIBRATION FOR APPRECIATING JDM/ENTHUSIAST IMPORTS",
  "SCORES MUST BE GENUINELY DIFFERENTIATED",
  "FAULT NAMES MUST REFERENCE SPECIFIC COMPONENTS",
  "Return ONLY valid JSON",
  "alternatives[].priceRange — approximate NZD price range",
];
for (const phrase of sharedPhrases) {
  expect(`serious prompt contains "${phrase}"`, serious.includes(phrase));
  expect(`roast prompt contains "${phrase}"`, roast.includes(phrase));
}

expect(
  "serious === HEAD + VOICE_SERIOUS + TAIL concatenation",
  serious === `${SYSTEM_PROMPT_HEAD}\n\n${VOICE_SERIOUS}\n\n${SYSTEM_PROMPT_TAIL}`
);
expect(
  "roast === HEAD + VOICE_ROAST + TAIL concatenation",
  roast === `${SYSTEM_PROMPT_HEAD}\n\n${VOICE_ROAST}\n\n${SYSTEM_PROMPT_TAIL}`
);

expect("serious prompt does NOT contain roast voice", !serious.includes("roasting this listing at the pub"));
expect(
  "roast prompt does NOT contain serious-only voice line",
  !roast.includes("Be brutally honest. If it's overpriced because the seller knows enthusiasts will pay, say so.")
);

expect("roast voice has the score-integrity guardrail", VOICE_ROAST.includes("SCORES AND CLASSIFICATIONS ARE NOT PART OF THE JOKE"));
expect("roast voice states the protected-characteristics boundary", VOICE_ROAST.includes("protected characteristic"));
expect("roast voice states the seller-as-person boundary", VOICE_ROAST.includes("never mock the seller as a person"));

if (failures > 0) {
  console.error(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("ALL PASS");
}
```

- [ ] **Step 3: Run the verification script**

Run: `npx --yes tsx scripts/_verify-roast-prompt.ts`
Expected: every line prints `PASS`, final line `ALL PASS`, exit code 0.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `app/api/analyze/route.ts`. (An error about `scripts/_verify-roast-prompt.ts` importing a `.ts` extension is expected and harmless — same as encountered during the Tally Up fix — because that script is deleted in the next step, not part of the committed tree.)

- [ ] **Step 5: Delete the verification script and commit**

```bash
rm scripts/_verify-roast-prompt.ts
git add app/api/analyze/route.ts
git commit -m "feat: split analyze prompt into shared base + roast/serious voice"
```

---

### Task 2: Add `mode` to the `Analysis` type

**Files:**
- Modify: `app/_lib/analysis.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Analysis.mode?: "roast"` — consumed by Task 3 (client stamps it), Task 4 (badge rendering reads it), Task 5 (share text reads it).

- [ ] **Step 1: Add the field**

In `app/_lib/analysis.ts`, find:

```ts
  investmentScore?: number;
  vibeScore?: number;
};
```

Replace with:

```ts
  investmentScore?: number;
  vibeScore?: number;
  // Set client-side when the analysis was requested with Roast Mode on —
  // absent reads as serious, same backward-compatible pattern as
  // FaultConfidence above.
  mode?: "roast";
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_lib/analysis.ts
git commit -m "feat: add optional mode field to Analysis for Roast Mode"
```

---

### Task 3: Roast Mode toggle on the analyse screen

**Files:**
- Modify: `app/_components/ui.tsx` (add a `Switch` component)
- Modify: `app/page.tsx` (state, POST body, response stamping, toggle UI)

**Interfaces:**
- Consumes: none new beyond what Tasks 1–2 produced (`roast` request field, `Analysis.mode`).
- Produces: `Switch({ checked: boolean; onChange: (v: boolean) => void; label: string })` component, used only by `app/page.tsx` for now.

- [ ] **Step 1: Add the `Switch` component**

In `app/_components/ui.tsx`, add after the `Pill` component (before the `LOADING_MESSAGES` constant):

```tsx
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 group"
    >
      <span className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-ember-500" : "bg-carbon-800 border border-line-strong"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-carbon-950 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </span>
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted group-hover:text-ink transition-colors">
        {label}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Import `Switch` in `app/page.tsx`**

Find:

```ts
import { Card, RotatingMessage, WheelSpinner } from "./_components/ui";
```

Replace with:

```ts
import { Card, RotatingMessage, WheelSpinner, Switch } from "./_components/ui";
```

- [ ] **Step 3: Add `roastMode` state**

Find:

```ts
  // Set when the user arrived via the Android share sheet — remembered so the
  // saved check can link back to the listing it came from
  const [listingUrl, setListingUrl] = useState<string | undefined>();
```

Replace with:

```ts
  // Set when the user arrived via the Android share sheet — remembered so the
  // saved check can link back to the listing it came from
  const [listingUrl, setListingUrl] = useState<string | undefined>();
  // Sticky across "Analyse Another Listing" — deliberately not reset in
  // handleReset(), matching how the Paste Text/Screenshots tab selection
  // already persists across resets.
  const [roastMode, setRoastMode] = useState(false);
```

- [ ] **Step 4: Send `roast` in the POST body**

Find:

```ts
      const body = mode === "text"
        ? { pastedText: textOverride ?? pastedText }
        : { images: images.map((i) => i.dataUrl) };
```

Replace with:

```ts
      const body = mode === "text"
        ? { pastedText: textOverride ?? pastedText, roast: roastMode }
        : { images: images.map((i) => i.dataUrl), roast: roastMode };
```

- [ ] **Step 5: Stamp `mode` on the parsed response**

Find:

```ts
      } else {
        setResult(data as Analysis);
        setInputCollapsed(true);
        saveCheck(data as Analysis, listingUrl);
      }
```

Replace with:

```ts
      } else {
        const analysis = data as Analysis;
        analysis.mode = roastMode ? "roast" : undefined;
        setResult(analysis);
        setInputCollapsed(true);
        saveCheck(analysis, listingUrl);
      }
```

- [ ] **Step 6: Add the toggle UI above the Analyse button**

Find:

```tsx
            {error && (
              <div className="flex gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: V_RED.bg, border: `1px solid ${V_RED.border}` }}>
                <span className="flex-shrink-0 font-bold" style={{ color: V_RED.text }}>!</span>
                <p className="text-sm leading-relaxed" style={{ color: V_RED.text }}>{error}</p>
              </div>
            )}

            <button
              onClick={() => analyse()}
              disabled={!canAnalyse || loading}
              className="w-full bg-ember-500 hover:bg-ember-400 active:bg-ember-600 disabled:bg-carbon-800 disabled:text-ink-faint disabled:cursor-not-allowed text-carbon-950 font-mono font-bold uppercase tracking-[0.22em] rounded-lg py-4 transition-all text-xs"
            >
              {loading ? "Getting Under the Hood..." : "Analyse Listing"}
            </button>
```

Replace with:

```tsx
            {error && (
              <div className="flex gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: V_RED.bg, border: `1px solid ${V_RED.border}` }}>
                <span className="flex-shrink-0 font-bold" style={{ color: V_RED.text }}>!</span>
                <p className="text-sm leading-relaxed" style={{ color: V_RED.text }}>{error}</p>
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <Switch checked={roastMode} onChange={setRoastMode} label="Roast Mode" />
              <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
                Same verdict, savage delivery.
              </p>
            </div>

            <button
              onClick={() => analyse()}
              disabled={!canAnalyse || loading}
              className="w-full bg-ember-500 hover:bg-ember-400 active:bg-ember-600 disabled:bg-carbon-800 disabled:text-ink-faint disabled:cursor-not-allowed text-carbon-950 font-mono font-bold uppercase tracking-[0.22em] rounded-lg py-4 transition-all text-xs"
            >
              {loading ? "Getting Under the Hood..." : "Analyse Listing"}
            </button>
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/_components/ui.tsx app/page.tsx
git commit -m "feat: add Roast Mode toggle to the analyse screen"
```

---

### Task 4: `RoastBadge` component

**Files:**
- Modify: `app/_components/badges.tsx`

**Interfaces:**
- Consumes: `themeToStyle`, `VerdictTheme` (already in this file).
- Produces: `RoastBadge(): JSX.Element` — a no-props component, consumed by Task 5.

- [ ] **Step 1: Add a `V_EMBER` theme and the `RoastBadge` component**

In `app/_components/badges.tsx`, find:

```ts
export const V_NEUTRAL: VerdictTheme = { bg: "#1c1c20", border: "#3a3a42", text: "#a6a29a" };
```

Replace with:

```ts
export const V_NEUTRAL: VerdictTheme = { bg: "#1c1c20", border: "#3a3a42", text: "#a6a29a" };
// Roast Mode's own theme — ember-hued, deliberately distinct from V_AMBER so
// it never reads as a severity signal. It's a modifier on a check, not part
// of the verdict system above.
export const V_EMBER: VerdictTheme = { bg: "#2a1708", border: "#8a5a1e", text: "#f5b04c" };
```

Then, at the end of the file, add:

```tsx

export function RoastBadge() {
  return <span style={themeToStyle(V_EMBER)}>🔥 Roasted</span>;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (there are no other usages yet, so `RoastBadge`/`V_EMBER` being unused elsewhere is fine — they're exported, not module-private).

- [ ] **Step 3: Commit**

```bash
git add app/_components/badges.tsx
git commit -m "feat: add RoastBadge component"
```

---

### Task 5: Render `RoastBadge` on the results page, Garage list, and Tally Up

**Files:**
- Modify: `app/_components/AnalysisResults.tsx`
- Modify: `app/_components/GarageView.tsx`
- Modify: `app/_components/TallyPanels.tsx`

**Interfaces:**
- Consumes: `RoastBadge` from Task 4, `Analysis.mode` from Task 2.
- Produces: nothing new for later tasks — this is a leaf UI task.

- [ ] **Step 1: `AnalysisResults.tsx` — import `RoastBadge`**

Find:

```tsx
import {
  V_RED, V_AMBER, V_GREEN, V_NEUTRAL,
  VERDICT_THEME_MAP, TAX_LEVEL_THEMES,
  themeToStyle, verdictBadgeStyle,
  VerdictBadge, RatingBadge,
} from "./badges";
```

Replace with:

```tsx
import {
  V_RED, V_AMBER, V_GREEN, V_NEUTRAL,
  VERDICT_THEME_MAP, TAX_LEVEL_THEMES,
  themeToStyle, verdictBadgeStyle,
  VerdictBadge, RatingBadge, RoastBadge,
} from "./badges";
```

- [ ] **Step 2: `AnalysisResults.tsx` — render the badge next to the label pill**

Find:

```tsx
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
```

Replace with:

```tsx
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
            {result.mode === "roast" && <RoastBadge />}
```

- [ ] **Step 3: `GarageView.tsx` — import `RoastBadge`**

Find:

```ts
import { verdictBadgeStyle } from "./badges";
```

Replace with:

```ts
import { verdictBadgeStyle, RoastBadge } from "./badges";
```

- [ ] **Step 4: `GarageView.tsx` — render the badge in the list**

Find:

```tsx
                        {a.label && (
                          <div className="mt-3">
                            <span style={verdictBadgeStyle(a.label)}>{a.label}</span>
                          </div>
                        )}
```

Replace with:

```tsx
                        {a.label && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span style={verdictBadgeStyle(a.label)}>{a.label}</span>
                            {a.mode === "roast" && <RoastBadge />}
                          </div>
                        )}
```

- [ ] **Step 5: `TallyPanels.tsx` — import `RoastBadge`**

Find:

```tsx
import { V_RED, verdictBadgeStyle } from "./badges";
```

Replace with:

```tsx
import { V_RED, verdictBadgeStyle, RoastBadge } from "./badges";
```

- [ ] **Step 6: `TallyPanels.tsx` — render the badge in `CarHeader`**

Find:

```tsx
      {analysis.label && (
        <div className="pt-0.5">
          <span style={{ ...verdictBadgeStyle(analysis.label), whiteSpace: "normal" as const }}>{analysis.label}</span>
        </div>
      )}
```

Replace with:

```tsx
      {analysis.label && (
        <div className="pt-0.5 flex flex-wrap items-center gap-1.5">
          <span style={{ ...verdictBadgeStyle(analysis.label), whiteSpace: "normal" as const }}>{analysis.label}</span>
          {analysis.mode === "roast" && <RoastBadge />}
        </div>
      )}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/_components/AnalysisResults.tsx app/_components/GarageView.tsx app/_components/TallyPanels.tsx
git commit -m "feat: show RoastBadge on results page, Garage list, and Tally Up"
```

---

### Task 6: Mark roast checks in share text

**Files:**
- Modify: `app/_lib/analysis.ts` (`buildShareText`)
- Modify: `app/_lib/compare.ts` (`buildTallyShareText`)
- Test: `scripts/_verify-roast-share-text.ts` (temporary, deleted at the end of this task)

**Interfaces:**
- Consumes: `Analysis.mode` from Task 2.
- Produces: no new exports — both functions keep their existing signatures.

- [ ] **Step 1: `app/_lib/analysis.ts` — mark roast checks in `buildShareText`**

Find:

```ts
  return [
    `Motormind check: ${title}${price}`,
    [a.label, scores].filter(Boolean).join(" · "),
    a.verdict ? `"${a.verdict}"` : "",
    `${flags} Full read: www.motormind.nz`,
  ].filter(Boolean).join("\n");
```

Replace with:

```ts
  return [
    `Motormind check: ${title}${price}${a.mode === "roast" ? " (Roasted)" : ""}`,
    [a.label, scores].filter(Boolean).join(" · "),
    a.verdict ? `"${a.verdict}"` : "",
    `${flags} Full read: www.motormind.nz`,
  ].filter(Boolean).join("\n");
```

- [ ] **Step 2: `app/_lib/compare.ts` — mark roast checks in `buildTallyShareText`**

Find:

```ts
  const titled = (x: Analysis) => {
    const withYear = [isSpecified(x.vehicle.year) ? x.vehicle.year : "", name(x)].filter(Boolean).join(" ");
    return x.vehicle.price ? `${withYear} (${x.vehicle.price})` : withYear;
  };
```

Replace with:

```ts
  const titled = (x: Analysis) => {
    const withYear = [isSpecified(x.vehicle.year) ? x.vehicle.year : "", name(x)].filter(Boolean).join(" ");
    const priced = x.vehicle.price ? `${withYear} (${x.vehicle.price})` : withYear;
    return x.mode === "roast" ? `${priced} (Roasted)` : priced;
  };
```

- [ ] **Step 3: Write the verification script**

Create `scripts/_verify-roast-share-text.ts`:

```ts
import { buildShareText } from "../app/_lib/analysis.ts";
import { buildTallyShareText, tallyUp } from "../app/_lib/compare.ts";
import type { Analysis } from "../app/_lib/analysis.ts";

function baseAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    vehicle: {
      make: "Mazda", model: "RX-7", year: "1999", variant: "", mileage: "",
      price: "$55,000", transmission: "Manual", colour: "", importStatus: "", location: "",
    },
    label: "Future Classic",
    verdict: "",
    whatMakesSpecial: "",
    whyEnthusiastsCare: "",
    ownerVibe: { label: "", reasoning: "" },
    specSignificance: [],
    priceVerdict: { assessment: "", reason: "" },
    enthusiastTax: { level: "Moderate", reasons: [] },
    ownershipPain: { score: 6, issues: [] },
    drivingCharacter: {
      steeringFeel: { score: 8, description: "" },
      engineCharacter: { score: 9, description: "" },
      dailyComfort: { score: 5, description: "" },
      overallFun: { score: 9, description: "" },
      summary: "",
    },
    classicPotential: { score: 9, reasons: [] },
    worstFinancialDecision: { rating: "Manageable Pain", reasons: [] },
    redFlags: [],
    regretRisk: { level: "Medium", reason: "" },
    questionsToAsk: [],
    enthusiastTake: "",
    investmentScore: 8,
    vibeScore: 9,
    ...overrides,
  } as Analysis;
}

let failures = 0;
function expect(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) failures++;
}

const serious = baseAnalysis();
const roasted = baseAnalysis({ mode: "roast" });

expect("buildShareText: serious check has no (Roasted) marker", !buildShareText(serious).includes("(Roasted)"));
expect("buildShareText: roast check includes (Roasted) marker", buildShareText(roasted).includes("(Roasted)"));

const tally = tallyUp(serious, roasted);
const tallyText = buildTallyShareText(serious, roasted, tally);
expect("buildTallyShareText: contains exactly one (Roasted) marker", (tallyText.match(/\(Roasted\)/g) ?? []).length === 1);

if (failures > 0) {
  console.error(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("ALL PASS");
}
```

- [ ] **Step 4: Run the verification script**

Run: `npx --yes tsx scripts/_verify-roast-share-text.ts`
Expected: all `PASS`, final line `ALL PASS`, exit code 0.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the temporary script's `.ts`-extension import error is expected and harmless, same as Task 1).

- [ ] **Step 6: Delete the verification script and commit**

```bash
rm scripts/_verify-roast-share-text.ts
git add app/_lib/analysis.ts app/_lib/compare.ts
git commit -m "feat: mark Roast Mode checks in share text"
```

---

### Task 7: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: nothing — this is the final gate before the branch is considered done.

This task needs a real `OPENAI_API_KEY` in `.env.local` (per `CONTRIBUTING.md`) and live model output, so it can't be scripted the way Tasks 1/6 were — it's the same kind of manual browser pass used to verify the Tally Up margin fix.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background)
Expected: `Ready` on `http://localhost:3000` (or the next free port if 3000 is taken).

- [ ] **Step 2: Analyse a listing with Roast Mode off**

In the browser, go to `/`, paste any real car listing text, leave "Roast Mode" off, click "Analyse Listing".
Expected: normal measured-tone result, as before this feature existed. No 🔥 Roasted badge anywhere on the results page.

- [ ] **Step 3: Analyse the same listing with Roast Mode on**

Click "New Analysis", toggle "Roast Mode" on, paste the same listing text, click "Analyse Listing".
Expected: result reads with a savage/comedic voice in the prose fields (verdict, enthusiastTake, issue descriptions). The 🔥 Roasted badge appears next to the label pill on the results page. Compare `investmentScore`, `vibeScore`, `label`, and `priceVerdict.assessment` against the serious run from Step 2 — they should be identical or very close (LLM output isn't perfectly deterministic even at `temperature: 0.3`, but there should be no systematic skew).

- [ ] **Step 4: Verify the toggle is sticky**

Click "Analyse Another Listing".
Expected: "Roast Mode" is still on (not reset).

- [ ] **Step 5: Verify the Garage badge**

Go to `/garage`.
Expected: the roast check from Step 3 shows the 🔥 Roasted badge in its list card; the serious check from Step 2 does not.

- [ ] **Step 6: Verify Tally Up with mixed modes**

Select both checks (one roast, one serious), tap "Tally Up".
Expected: each car's header shows its own badge state correctly (roast side badged, serious side not). Row winners in the tally table are unaffected by which side is roasted — confirm this by comparing the row-by-row winners against what you'd expect purely from the two cars' numeric scores (unrelated to which is roasted).

- [ ] **Step 7: Verify export/import round-trip**

From the roast check's detail view, export it (downloads a `.json`), then re-import it via "import a mate's check" on `/garage`.
Expected: the re-imported check still shows the 🔥 Roasted badge — `mode` survived the round trip.

- [ ] **Step 8: Stop the dev server**

Kill the background `npm run dev` process (or the terminal running it).

- [ ] **Step 9: Final full-repo typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the repo.

No commit for this task — it's verification only. If any step fails, go back to the relevant earlier task, fix, re-run that task's own verification, then re-run this task from Step 1.
