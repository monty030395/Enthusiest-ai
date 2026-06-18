# Live Trade Me Testing — Round 2 (EV / untested segment)

Pulled **live, public Trade Me listings** (rendered in headless Edge via
`scripts/fetch-listing.ps1`, since Trade Me is a JS SPA that a plain fetch can't
read) and ran each through **production `/api/analyze`** — i.e. the *tuned* prompt
now live on `main`. Harness: `run-live.ps1`. Raw responses + source text in `live/`.

Focused on the segment we'd never tested: **EVs**, deliberately including brand-new
obscure Chinese marques to stress unknown-marque handling.

## Results

| Listing | price | label | ownerVibe | inv | vibe | redFlags |
|---|---|---|---|---|---|---|
| 2022 Tesla Model Y RWD | $43,900 | Peak Daily Driver | Dealer / Trade Listing | 7 | 6 | 0 |
| 2026 Kia EV5 | $79,990 | Premium Asking Price | Dealer / Trade Listing | 5 | 6 | 0 |
| 2026 Dongfeng Box | $30,980 | Peak Daily Driver | Dealer / Trade Listing | 4 | 4 | 0 |
| 2026 Leapmotor C10 | $49,990 | Overrated | Dealer / Trade Listing | 4 | 3 | 0 |
| 2023 Lexus UX 300e | $59,888 | Premium Asking Price | Dealer / Trade Listing | 7 | 6 | 0 |

## What this confirmed (tuned prompt holding up well)

- **Unknown-marque handling — no hallucination.** The brand-new Dongfeng Box and
  Leapmotor C10 (≈zero real-world history) did NOT get fabricated specs or invented
  fault points. performanceSpecs returned "Electric Motor" with 0 figures; ownershipPain
  logged honest "Brand unfamiliarity / unproven reliability / parts-support risk" instead
  of made-up component failures. The "name specific faults" rule did not force fabrication.
- **Correct identification.** Even nailed that the Leapmotor C10 is a *range-extender
  hybrid* (~1,000 km), not a pure EV.
- **`Dealer / Trade Listing`** (the new label) applied correctly to all 5 dealer ads.
- **Red-flag restraint.** All 5 returned redFlags=0 — correct, because the fetched pages
  include MotorWeb checks (Money owing / Re-registered / Stolen: Passed). So the more
  aggressive red-flag *inference* from Round 1 did NOT start false-firing on clean cars.
- **Real prices** (fetched pages include the price) → genuine priceVerdicts; Dongfeng &
  Leapmotor correctly flagged "Overpriced"/ambitious for unproven brands.
- **vibeScore spread held** (3–6): obscure Chinese EVs 3–4, mainstream EVs 6.
- Accurate specs on the *known* EV (Tesla Model Y RWD: 220kW / 420Nm / 6.9s / 1909kg).

## Minor EV-fit polish (candidates for a future tweak — not errors)

1. **ICE-centric `drivetrain` codes.** EVs came back as `"FR, RWD"` — "FR" (front-engine,
   rear-drive) is meaningless for a rear-motor EV. Should be just `RWD`/`AWD` or
   "Rear Motor" for electric.
2. **"Engine" framing for EVs.** `drivingCharacter.engineCharacter` adapts its text well
   ("instant torque, silent powertrain") but the field/label is still "Engine"; a
   "Powertrain" label would read better for EVs.
3. **Generic `engine` value.** EVs return `"Electric Motor"`; could be "Single Motor RWD"
   etc., but this is cosmetic.

Verdict: the tuning generalises cleanly to a segment it was never tuned on. The only
follow-ups are cosmetic EV-awareness tweaks, which can be bundled into a later pass.

---

# Live Trade Me Testing — Round 3 (high-risk: JDM imports + V8 projects)

Targeted the high-risk end to validate that the Round-1 red-flag *inference* actually
**fires** in the wild (the EV batch was all clean dealer stock). Raw responses in `live2/`.

| Listing | price | km | import | label | ownerVibe | inv | vibe | red |
|---|---|---|---|---|---|---|---|---|
| 1995 Nissan Skyline R33 (private) | $36,000 | 190,000km | JDM Import | Premium Asking Price | Optimistic Dreamer | 5 | 7 | **3** |
| 2013 Nissan Skyline (dealer) | $12,999 | 128,565km | Unknown | Premium Asking Price | Dealer / Trade Listing | 5 | 6 | 0 |
| 2012 Subaru Impreza Sport (dealer) | $9,949 | 96,460km | Unknown | Peak Daily Driver | Dealer / Trade Listing | 6 | 5 | 0 |
| 2018 Subaru Impreza (dealer) | $19,985 | 58,124km | Unknown | Peak Daily Driver | Dealer / Trade Listing | 5 | 5 | 0 |
| 2019 Holden Commodore Tourer (dealer) | $29,990 | 85,000km | NZ New | Peak Daily Driver | Dealer / Trade Listing | 6 | 6 | 0 |
| 2016 Holden Commodore (dealer) | $21,999 | 128,273km | NZ New | Peak Daily Driver | Dealer / Trade Listing | 6 | 6 | 0 |

## Working well
- The **private 1995 R33 fired 3 flags** and read as Overpriced / Optimistic Dreamer —
  the red-flag inference triggers correctly on a genuine old private import.
- Dealer cars with **completed, Passed MotorWeb checks correctly stayed red=0** — the
  more-aggressive inference did NOT false-fire when the background check was clean.
- Model-specific accuracy held (RB25DET turbo failure, R33 rear-arch rust, etc.).

## NEW issues found

### N1 (HIGH — precision regression I introduced) — red flags fabricated from BLANK fields
The R33's flags included **"Expired WOF"** and **"Registration Expired"**, but in the
fetched listing those fields are simply **empty** ("Registration expires:" / "WoF expires:"
blank) and the MotorWeb checks were **never run** (private listing — shows the "we'll
re-run the money owing check" placeholder, not a result). The model read *absent* data as
*expired/failed*. **Empty ≠ expired.** This is the flip-side of the Round-1 recall fix:
inference is now over-firing on missing structured fields.
- Fix: only flag WOF/rego as expired when the listing **explicitly says so** (expired date,
  "no WOF", "no rego"); treat a blank WoF/rego field or an un-run background check as
  **"unknown — ask the seller"**, never as a failure.

### N2 (MEDIUM — H2 parroting recurrence) — the socialStanding example still leaks
The R33 returned `socialStanding` = "The car that makes WRX owners look twice and Honda
guys quietly jealous." — the **verbatim prompt example**. The global "don't reuse examples"
rule fixed the common case (BMW) but archetype-matching cars (a JDM hero) still pull the
vivid example. Fix properly by **neutering/removing that specific example string** in the
prompt rather than relying on the don't-reuse rule.

(Also still present: the Round-2 EV polish items — ICE-centric drivetrain codes etc.)

