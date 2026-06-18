# Motormind UI Redesign — Editorial Dark Theme

Full visual redesign of the Motormind app (NZ car-buying copilot). **Styling, layout,
and visual hierarchy only — zero functional changes.** Routing, component structure,
state, the analysis API, and all AI output are untouched.

Branch: `feature/fable5-ui-redesign`

---

## Design direction

A **modern car magazine meets fintech dashboard**: warm near-black surfaces, ivory
editorial ink, a single confident **ember** accent (warm amber/gold), strong display
typography, mono for all data and labels, generous whitespace, and a subtle film-grain
texture over everything. The previous look was a generic red-accent dark-SaaS theme; the
red now survives only where it carries meaning (the Red Flags danger card).

---

## Design token system

Defined CSS-first in [`app/globals.css`](app/globals.css) using Tailwind 4's `@theme`
(this project has no `tailwind.config.ts` — Tailwind 4 is CSS-first). Tokens, not ad-hoc
hex values, drive every component.

### Colour

| Token | Value | Use |
|---|---|---|
| `carbon-950 → 600` | `#0b0b0c → #36363e` | warm near-black surface scale |
| `ink` / `ink-muted` / `ink-faint` | `#f4f2ed` / `#a39f96` / `#6e6a63` | ivory editorial text scale |
| `ember-300 → 700` | `#ffce7a → #9a6112` | brand accent (price sticker, headlines, labels, focus) |
| `line` / `line-strong` | `rgba(255,255,255,.08 / .15)` | hairline borders instead of solid greys |

Verdict/rating badge palettes (`V_RED/AMBER/GREEN/BLUE/NEUTRAL`) were re-tuned from cold
to **warm** tones so signal colours sit naturally on the carbon theme.

### Type

| Token | Family | Role |
|---|---|---|
| `font-display` | **Syne** (700/800) | hero headlines, card titles, section headers |
| `font-sans` | **Inter** | body copy |
| `font-mono` | **JetBrains Mono** | all labels, data, scores, badges, eyebrows |

(Previously Geist Sans/Mono throughout.)

### Texture & chrome

- Fixed **film-grain** overlay (inline SVG turbulence, 5% opacity, `mix-blend overlay`).
- **Glassmorphic sticky masthead** (`backdrop-blur`, hairline bottom border).
- Ember `::selection` and `:focus-visible` ring.

---

## What changed, component by component

**Global** — `globals.css` rewritten to token system + grain + selection/focus.
`layout.tsx` swapped Geist → Inter/Syne/JetBrains Mono; viewport theme-color → carbon.
`manifest.json` background/theme colours → carbon.

**Masthead** — now sticky + glassmorphic; wordmark in Syne; "NZ Car Copilot" as a mono
eyebrow; ember pulse dot.

**Hero (input)** — added "Pre-Purchase Intelligence" mono eyebrow; headline in oversized
Syne with ember second line; tabs, dropzone, textarea, smart-paste hint and primary
button restyled to hairline borders + ember. Primary CTA is now an ember (not red) block
with mono tracking.

**Results hero tile** — ember top-hairline (was a thick red gradient bar); ember **price
sticker** with mono numerals; "BMW M3" in Syne; spec pills as hairline mono chips;
performance specs as a mono data grid; score chips restyled.

**Section headers** — `Investment / Character / Street Cred` now lead with an **oversized
ghosted index numeral** (`01 / 02 / 03`) in Syne beside an ember mono label — the strongest
editorial signature of the redesign.

**All result cards** — Price Analysis, Enthusiast Tax (incl. the `+$NZD` premium badge),
Price Outlook, Wallet Damage, Reliability Risk, Market Trend, Future Classic, Driving
Character, Mod Potential, Owner Vibe, Cars & Coffee, Community Credibility, Regret Risk,
Spec Significance, Ask the Seller, Alternatives — all moved to carbon surfaces, hairline
borders, ink scale, mono labels, ember bullets/rules. Card padding loosened (`p-5 → p-6`).

**Red Flags** — intentionally kept red (semantic danger), lightly modernised.

**The Enthusiast Take** — ember header bar with carbon text; larger body.

**Privacy page** ([`app/privacy/page.tsx`](app/privacy/page.tsx)) — rebranded the leftover
"EnthusiastAI" → Motormind, restyled to match; fixed stale "Trade Me URL" copy (URL input
was removed in an earlier change).

---

## Before / after

Side-by-side composites in [`screenshots/compare/`](screenshots/compare):

- [Landing](screenshots/compare/landing-desktop.png)
- [Results hero](screenshots/compare/results-hero.png)
- [Landing — mobile](screenshots/compare/landing-mobile.png)
- [Privacy](screenshots/compare/privacy-desktop.png)

Full sets in [`screenshots/before/`](screenshots/before) and
[`screenshots/after/`](screenshots/after):

| View | Before | After |
|---|---|---|
| Landing (desktop) | `01-landing-desktop` | `01-landing-desktop` |
| Screenshots tab | `02-screenshots-tab-desktop` | `02-screenshots-tab-desktop` |
| Smart-paste URL hint | `03-url-hint-desktop` | `03-url-hint-desktop` |
| Loading state | `04-loading-desktop` | `04-loading-desktop` |
| Results (full) | `05-results-full-desktop` | `05a…05f-results-desktop` |
| Results hero | `06-results-hero-desktop` | `06-results-hero-desktop` |
| Results (mobile) | `07-results-full-mobile` | `07a…07c-results-mobile` |
| Landing (mobile) | `08-landing-mobile` | `08-landing-mobile` |
| Privacy (mobile) | `09-privacy-mobile` | `09-privacy-mobile` |
| Privacy (desktop) | `10-privacy-desktop` | `10-privacy-desktop` |

---

## How the screenshots were captured

No Node/dev server runs on this machine, so shots were taken against deployed builds:

- **Before** — production (`www.motormind.nz`, the pre-redesign `main`) via headless Edge
  driven over the DevTools protocol ([`scripts/capture-ui.ps1`](scripts/capture-ui.ps1)),
  giving full-page captures.
- **After** — the branch's Vercel preview, which sits behind Vercel deployment protection.
  Headless browsers hit the auth wall, so the after-set was captured by driving the user's
  logged-in Chrome in a chromeless `--app` window
  ([`scripts/desktop-capture.psm1`](scripts/desktop-capture.psm1)), with extensions
  disabled to avoid a Grammarly overlay injecting into the page.

Notes: the after **results** and **mobile-results** views are multi-part sequences
(`05a…`, `07a…`) rather than one stitched full-page image, because the desktop-window
method captures a viewport at a time. The after **loading** shot renders at a slightly
smaller page zoom (the paste interaction nudges Chrome's per-site zoom) — it is a transient
state and remains fully legible.
