# Roast Mode — Design

Status: approved, not yet implemented.
Roadmap entry: [PR #29](https://github.com/monty030395/Enthusiest-ai/pull/29) (`ROADMAP.md`, "Future ideas").

## Summary

A toggle on the analyse screen that, when on, produces a full Motormind
analysis — same JSON schema, same scores, same red flags — written in a
savage, comedic voice instead of the app's normal measured-enthusiast tone.
Scoped to the single-car analysis only for v1: Tally Up and Settle It
(head-to-head) are untouched and simply consume whatever text a saved
analysis already contains.

## What gets roasted

All three, blended: the seller's listing copy and puffery, the car's actual
flaws and stereotypes, and the buyer's judgement for considering it. Not
scoped to just one target — whatever's funniest for the specific listing.

## Savagery ceiling

Harder edge than the app's current "brutally honest" baseline, with mild
profanity permitted ("bloody", "shit box"). Hard boundaries, non-negotiable:
no slurs, no attacks on protected characteristics, and the seller is never
mocked as a person (name, photo) — only their listing copy and claims are
fair game. The car and the pitch are the targets; people's identities are
not.

## Score integrity

Scores and classifications stay objectively identical to what serious mode
would produce for the same listing — only the prose changes. This is what
keeps Tally Up and Garage comparisons meaningful even when someone mixes
roast and serious checks, and it's enforced structurally (see Prompt
architecture below), not just implied by tone instructions.

## Prompt architecture

`app/api/analyze/route.ts` currently has one `SYSTEM_PROMPT` constant
covering both *what* to say (engine-code identification methodology, the NZ
price-calibration table, scoring-objectivity rules, red-flag detection, the
full JSON schema and per-field definitions) and *how* to say it (the
`Rules:` block, roughly "Write like a knowledgeable, opinionated NZ car
enthusiast...").

Split it:

- **`SYSTEM_PROMPT_BASE`** — everything except the `Rules:` block, verbatim
  from today's prompt. Single source of truth for engine ID, price
  calibration, scoring objectivity, and the schema. Untouched by this
  feature.
- **`VOICE_SERIOUS`** — today's `Rules:` block, extracted as-is. No behavior
  change for the default path.
- **`VOICE_ROAST`** — a new `Rules:`-shaped block instructing the savage,
  comedic voice described above (target: all three, blended; ceiling:
  harder edge with mild profanity; boundaries: no slurs, no protected-class
  attacks, never mocks the seller as a person). Must include an explicit
  load-bearing instruction along these lines: *"Every numeric score, every
  pick-one enum field (label, priceVerdict.assessment, enthusiastTax.level,
  etc.), and the engine-identification rules above are governed only by the
  base rules and are NOT affected by this voice — score and classify
  exactly as you would in serious mode. Only the prose in text fields
  (verdict, whatMakesSpecial, enthusiastTake, issue descriptions, reasons,
  etc.) changes."*

Rationale for splitting rather than duplicating the whole prompt: the base
prompt is ~300 lines of rules that have been tuned fix-by-fix across
multiple issues (red-flag precision #17, engine-variant attribution #23,
NZ price calibration #24, listing-boilerplate detection #26). A fully
separate `ROAST_SYSTEM_PROMPT` would need every future fix ported twice or
the two modes would silently drift — roast checks would eventually give
worse car advice, not just funnier prose, which would undercut the
score-integrity requirement above. A shared base avoids that.

## API

`app/api/analyze/route.ts`: request body gains an optional `roast?:
boolean`. System prompt sent to OpenAI becomes `SYSTEM_PROMPT_BASE + (roast
? VOICE_ROAST : VOICE_SERIOUS)`. Model, `max_tokens`, `temperature`, retry
behavior, and error handling are unchanged. Still a single call — same
latency profile as today. Roast requests share the existing 30k
tokens/minute budget with everything else; no separate rate limit.

## Data model

`Analysis` (`app/_lib/analysis.ts`) gains one new optional field:

```ts
mode?: "roast";
```

Absent/undefined means serious — same backward-compatible pattern as the
existing `FaultConfidence` field (old saved checks, shares, and exports
simply don't have it, and nothing breaks).

It lives on `Analysis`, not `SavedCheck`, because `Analysis` is what
actually flows through export, import, share links (`/c/<id>`), and Tally
Up — `SavedCheck` is just an id/timestamp wrapper around it.

No API response schema change is needed to set it: the client already knows
whether it requested a roast, so `app/page.tsx`'s `analyse()` stamps
`data.mode = roastMode ? "roast" : undefined` on the parsed response,
before `setResult`/`saveCheck`. The route stays a pure function of `roast
input → prompt`; it doesn't need to echo the flag back.

## UI — trigger

A toggle on the analyse screen (`app/page.tsx`), positioned just above the
"Analyse Listing" button — the one spot shared by both the Paste Text and
Screenshots input tabs. Small switch, mono uppercase label "Roast Mode",
with a one-line tagline in the app's existing understated hint style (e.g.
"Same verdict, savage delivery.").

State: `const [roastMode, setRoastMode] = useState(false)` in `Home`.
Included as `roast: roastMode` in the POST body for both the text and
screenshots code paths. **Sticky** across "Analyse Another Listing" —
deliberately not reset in `handleReset()`, matching how the existing
Paste Text/Screenshots tab selection already persists across resets.

## UI — badge

One shared component, `RoastBadge()`, added to `app/_components/badges.tsx`
next to the existing `verdictBadgeStyle`/`V_RED`. Small ember-colored pill,
"🔥 Roasted" — visually distinct from the main label pill (that's the real
verdict, e.g. "Money Pit"; this is a modifier on top of it, not competing
with it).

Rendered conditionally on `analysis.mode === "roast"` in the three places a
label pill already appears:

- `AnalysisResults.tsx` — next to the main label pill on the results page
- `GarageView.tsx` — next to each saved check's label pill in the Garage
  list
- `TallyPanels.tsx`'s `CarHeader` — next to the label pill in Tally Up and
  on the shared `/c/[id]` page (which reuses `CarHeader`, so this is
  inherited for free, no extra work there)

One shared component rather than three inline copies, matching how
`badges.tsx` already centralizes this kind of styling.

`buildShareText`/`buildTallyShareText` (`app/_lib/compare.ts`) get a
one-line addition: append "(Roasted)" when `mode === "roast"`, so a shared
link's text preview doesn't read as Motormind's straight verdict to someone
who wasn't there for the toggle.

## Edge cases

- **Old saved checks / imports / shares with no `mode` field** — read as
  serious, no badge, unchanged behavior. Free consequence of the optional
  field.
- **Export/import** (`garage.ts`) — `mode` is a plain field on `Analysis`;
  round-trips through `JSON.stringify`/`parse` with no special-casing.
- **Tally Up: roast check vs. serious check** — explicitly allowed (this is
  what makes the score-integrity requirement meaningful in the first
  place). Each side's own badge makes it visually obvious which prose is
  the joke.
- **Rate limiting** — roast requests hit the same endpoint and share the
  same 30k tokens/minute ceiling as serious requests; worth a one-line code
  comment in the route so a future reader doesn't wonder why there's no
  separate limit.

## Out of scope for v1

- Settle It (`/api/compare` head-to-head) does not get a roast-toned
  prompt variant, even when one or both compared checks are roast-mode.
  It consumes whatever text is already in the saved analyses with its
  existing prompt.
- Tally Up's row-scoring logic (`app/_lib/compare.ts` `tallyUp()`) is
  unchanged — roast mode doesn't affect row winners, margins, or the tally
  itself, only the prose shown per row.

## Testing plan

No test framework exists in this repo (confirmed during the Tally Up
margin fix — verification there was done via a standalone script run with
`node --experimental-strip-types` / `npx tsx`, plus manual browser
verification). Same approach here:

1. Standalone script calling `/api/analyze` (or exercising the prompt
   construction directly) with `roast: false` and `roast: true` on the same
   listing text. Confirm both return schema-valid JSON, and confirm scores
   and enum picks (label, priceVerdict.assessment, etc.) land the same or
   very close between the two runs — the structural check that "scores stay
   honest" actually held, not just that the prompt asked for it.
2. `mode` round-trip check: analyse with roast on → save → export → import
   → confirm `mode` is still `"roast"`.
3. Manual browser verification via the dev server: toggle Roast Mode on,
   analyse a real listing, confirm the `RoastBadge` renders on the results
   page and in the Garage list; run a Tally Up against a separately-saved
   serious check and confirm the badge shows only on the roast side, and
   that row winners in the tally are unaffected by which side is roasted.
   Toggle off and confirm a normal analysis is unaffected (no badge, no
   voice change).
