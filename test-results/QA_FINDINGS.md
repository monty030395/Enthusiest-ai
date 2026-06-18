# Motormind — Listing Analysis QA Findings

Tester pass over 8 real Trade Me / Marketplace listings, run through the live
`/api/analyze` (production = `main` prompt, gpt-4o, temp 0.3). Raw JSON for each
is in this folder (`01-…` … `08-…`). Harness: `run-qa.ps1`.

## Test set & headline result

| # | Listing | label | ownerVibe | inv | vibe | redFlags |
|---|---|---|---|---|---|---|
| 01 | BMW 130i (modified, documented) | Hidden Gem | Mature Enthusiast Owner | 7 | 8 | 0 |
| 02 | 1998 Mazda RX-7 (JDM, 77k km, "insurance car") | Future Classic | Weekend Warrior | 8 | 9 | **0 ⚠** |
| 03 | 1981 Holden Kingswood (350 Chev V8 swap) | Future Classic | Weekend Warrior | 7 | 8 | 0 |
| 04 | Mazda Axela (NS Motors dealer, ALL CAPS) | Peak Daily Driver | Dealer Dressed as Private ⚠ | 6 | 5 | 0 |
| 05 | 2020 Mercedes C200 ("listed 8 weeks ago") | Peak Daily Driver | Rich Dentist Spec | 7 | 8 | 0 |
| 06 | Alfa 147 GTA (no make/model/year in text) | Future Classic | Mature Enthusiast Owner | 8 | 9 | **0 ⚠** |
| 07 | 2016 VW Golf 1.4 TSI R-Line (Merlion dealer) | Premium Asking Price | Dealer Dressed as Private ⚠ | 6 | 7 | 0 |
| 08 | 2005 Aston Martin DB9 (NZTA structural damage) | Money Pit | Dealer Dressed as Private | 3 | 8 | 1 ✓ |

**Bottom line:** factual specs and car identification are excellent. The weaknesses
are all in *judgment under ambiguity* — the red-flag scanner only fires on explicit
statements, missing price/odometer reasoning, dealer labelling, and a couple of
prompt-hygiene issues. Details below, ordered by severity.

---

## HIGH

### H1 — Red-flag scanner only catches explicit statements; misses inferential signals
Only **1 of 8** fired a red flag — the Aston, where the listing literally says
"recorded as structurally damaged by NZTA." Every inferential signal was missed,
even though the prompt's own red-flag list covers them:

- **RX-7 (02):** 1998 car (27 yrs) with "super low 77,000kms" ≈ **2,850 km/year** — the
  prompt explicitly lists *"Odometer discrepancy — unusually low KMs for age"* and
  *"Imported with… unknown history — odometer fraud risk."* Not flagged. Worse, the low
  km is treated as a **positive** ("Premium Justified", classicPotential 9,
  "low-mileage examples"). For a JDM import this is the #1 thing to verify.
- **Alfa GTA (06):** "The rego lapsed back in 2019" — prompt lists *"Registration lapsed
  or expired."* Not flagged, and not even raised in `questionsToAsk`.
- **RX-7 again:** "the insurance car being stored" + "ready for export" + "only been on
  the road few times" — at minimum worth probing; ignored.

**Recommended tuning**
- Add an explicit instruction to **compute km-per-year** (mileage ÷ age) and flag any
  import averaging under ~5,000 km/yr as an odometer-verification item.
- Instruct that low mileage on a JDM/grey import is a **verification flag, not a virtue** —
  and `questionsToAsk` must include "request the Japanese auction sheet to confirm km/grade."
- Tell it to scan for *lapsed/expired registration anywhere in prose* (not just structured fields).
- Soften the bar: the red-flag pass currently behaves as "only flag if explicitly stated."
  Add: "infer flags from implausible or ambiguous claims, not just explicit ones."

### H2 — Verbatim parroting of the prompt's own examples
The BMW 130i (01) returned, word-for-word, two example strings written *in the prompt as
illustrations*:
- `socialStanding` → "The car that makes WRX owners look twice and Honda guys quietly
  jealous." (prompt line ~268, verbatim)
- `marketTrend.reason` → "Values have plateaued — enthusiast floor is firm but high km
  and common availability cap any upside." (prompt line ~274, verbatim)

These are placeholder examples being emitted as real analysis. Any listing that doesn't
strongly steer the model will get boilerplate.

**Recommended tuning**
- Append to those field examples: *"(example only — never reuse this wording; write fresh,
  car-specific copy)"*, or replace the most-quotable examples with abstract templates, or
  move examples out of the field that most often parrots them.

---

## MEDIUM

### M1 — No-price listings still get confident price verdicts
**7 of 8 listings had no asking price.** `vehicle.price` was correctly left blank (no
hallucinated numbers — good), but `priceVerdict` still returned "Fair" / "Premium
Justified" / "Paying the Premium" and `investmentScore` was computed as if price were
known (e.g. Alfa: no price → priceVerdict "Fair", investmentScore 8). The model is
judging a number it was never given.

**Recommended tuning:** when no price is present, `priceVerdict.assessment` should be a
dedicated value (e.g. "No Price Listed") or the reason must state the verdict is
provisional, and `investmentScore` should be damped / caveated. Currently it projects
false confidence.

### M2 — "Dealer Dressed as Private" misapplied to overt dealers
Applied to **3 of 8** (Axela, Golf, Aston), but the label *means a dealer posing as a
private seller*. Only the Aston fits ("listed and sold on behalf of a private seller").
The Axela ("Welcome to NS Motors", finance, warranty packages) and Golf ("Merlion Motor
Group is a registered motor vehicle trader") are **openly** dealers — there's just no
plain "Dealer" option, so the model reaches for the nearest tag.

**Recommended tuning:** add an ownerVibe label like **"Dealer / Trade Listing"** for overt
dealers, and reserve "Dealer Dressed as Private" for genuine disguise (private-seller
framing hiding a trader).

### M3 — Stated time-on-market ignored
Mercedes (05) says "**Listed 8 weeks ago**." The prompt lists "how long it's been listed"
as an ownerVibe signal, but it was ignored: ownerVibe "Rich Dentist Spec", priceVerdict
"Fair", no negotiation note. 8 weeks unsold is a strong motivated-seller / overpriced cue.

**Recommended tuning:** explicitly instruct to use any stated listing age — ">4 weeks
listed" should push toward Motivated Seller and feed a negotiation angle in the verdict
or questions.

### M4 — Engine-swap specs fabricated as if factory
Kingswood (03): `performanceSpecs` reported "350 Small Block Chev V8" with **194 kW /
515 Nm** — specific figures invented for an unspecified build, contradicting the prompt's
own rule *"confirmed factory figures… do not estimate."* (Tellingly, it correctly left
`kerbWeightKg` 0 and `zeroToHundred` blank — so it's internally inconsistent.)

**Recommended tuning:** add handling for non-factory/swapped engines — identify the swap
in `engine`, but leave power/torque/0–100 at 0/blank (or give an explicitly-caveated
range), never a precise fabricated number.

---

## LOW / POLISH

- **L1 — Dealer hype partially absorbed (Golf 07):** the dealer's false "extremely rare"
  R-Line claim was echoed in `whatMakesSpecial`, `specSignificance`, and the
  `enthusiastTax` reason ("rarity"). R-Line is a cosmetic trim, not rare. Add: "actively
  debunk inflated seller claims — appearance/trim packages are not rarity."
- **L2 — `vibeScore` clusters high:** 8,9,8,5,8,9,7,8 — six of eight are 8–9, including a
  base C200 and a damaged DB9. `investmentScore` spread well (3–8); vibe didn't. Reinforce
  "use the full range; reserve 8–9 for genuinely iconic cars."
- **L3 — Mileage embedded in prose missed (BMW 01):** "@ 180,000km" sat inside a
  maintenance note; `mileage` came back blank and the high km wasn't factored into value.
  Instruct it to scan prose for odometer figures, not just an explicit mileage field.
- **L4 — Banned generic term leaked (Alfa 06):** "electrical gremlins" appeared in
  `questionsToAsk`; the prompt bans that phrase for fault names — extend the ban to all fields.
- **L5 — Alternatives can echo seller keyword spam:** Mercedes alternatives
  (320i / A4 / S60) mirrored the listing's keyword line "C class 320i A4 S60 XE."
  Harmless here, but ensure alternatives are independently reasoned, not lifted from SEO keywords.

---

## What's working well (don't regress these)
- **Car identification / inference:** nailed the Alfa **147 GTA** from a listing with *no
  make, model, year, or price* — purely from "GTA / Busso V6 / Cloverleaf / Italian Auto Center."
- **Explicit-damage path:** Aston fired the red flag, `enthusiastTake` acknowledged it,
  and scores were appropriately punitive (Money Pit, Falling, regretRisk High, inv 3).
- **Mundane cars aren't over-hyped:** Axela correctly scored classicPotential 2, carsCoffee
  Low, enthusiastTax None.
- **No hallucinated prices/years:** absent fields were left blank rather than invented.
- **Factual specs accurate** across N52, M274, 13B-REW, Busso V6, and the DB9 V12.

*(Note: en-dashes show as "â" in the saved JSON evidence files — a PowerShell encoding
artifact in the test harness only; the live API/UI render them correctly.)*
