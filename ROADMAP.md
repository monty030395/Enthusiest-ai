# Motormind Roadmap

Working plan for where the app goes next. Status: ✅ done · 🔨 in progress · ⬜ not started.

## Garage & Compare (the "tally up") — ✅ shipped

The core insight: results used to be ephemeral — one refresh and a check was
gone. Saving every check locally fixes that *and* is the foundation for
comparison. Storage is localStorage, device-only, which keeps the privacy
policy honest (nothing uploaded except a check you explicitly share).

| Phase | What | Status |
|---|---|---|
| 0 | Component refactor — extract the results view, badge/theme system, shared UI, Masthead | ✅ [PR #19](https://github.com/monty030395/Enthusiest-ai/pull/19) |
| 1 | The Garage — auto-save every check, list/reopen/remove/clear, masthead nav | ✅ [PR #19](https://github.com/monty030395/Enthusiest-ai/pull/19) — closes [#7](https://github.com/monty030395/Enthusiest-ai/issues/7) |
| 2 | Compare: tally table — side-by-side rows, per-row winner, totted-up score | ✅ [PR #19](https://github.com/monty030395/Enthusiest-ai/pull/19) |
| 3 | Compare: head-to-head ("Settle It") — `/api/compare`, forced winner, deal-breakers, "if it were my money" | ✅ [PR #20](https://github.com/monty030395/Enthusiest-ai/pull/20) — closes [#6](https://github.com/monty030395/Enthusiest-ai/issues/6) |
| 4 | Export / import / Share the Tally (Web Share API) | ✅ [PR #21](https://github.com/monty030395/Enthusiest-ai/pull/21) |
| 4b | Hosted share links — `motormind.nz/c/<id>`, read-only real UI, OG preview card, 90-day cron purge | ✅ [PR #21](https://github.com/monty030395/Enthusiest-ai/pull/21) |

### Share-link follow-ups (not yet done)

- ⬜ **Revoke a link from the Garage** — store created share ids (+ a revoke token) against the local check so you can pull a link before the 90 days is up. Today the only route is emailing to ask.
- ⬜ **Brand fonts in the OG card** — the card currently renders in the default sans because Satori needs font files loaded explicitly; embedding Syne/JetBrains Mono would make previews fully on-brand.
- ⬜ **Rate limiting on `/api/share`** — it's an unauthenticated write endpoint. Fine at current traffic, not fine if the app gets posted somewhere busy.

## Alternatives → Trade Me + share target — ✅ shipped ([PR #25](https://github.com/monty030395/Enthusiest-ai/pull/25), [#26](https://github.com/monty030395/Enthusiest-ai/pull/26))

Each alternative links out to a live Trade Me search (`searchTerm` field, NZ
badge naming, no price filter — see the pricing section below for why).
`share_target` in the manifest lets Trade Me's Android share sheet send a
listing straight to the installed app; `/share-target` catches it, and a
description-detection pass (#26) stops Trade Me's own canned forwarding
message from being mistaken for the seller's actual listing text. This also
shipped **listing provenance** — `SavedCheck.listingUrl` is now actually
populated, and the Garage detail view shows a "Listing ↗" link back to it.

**#10 status:** V1 (AI suggestions) and V2 (Trade Me search links) are both
done. **V3 (live Trade Me listings via their API) is effectively dead, not
just waiting:** since 10 April 2026 Trade Me only registers Marketplace API
apps for in-trade sellers, and its developer terms exclude buyer-side tools,
price monitoring, data aggregation and scraping. Motormind won't get
approved. V2's search links already deliver most of the value, so the
realistic move is to close #10 as won't-do.

## Shared-listing fetch via Apify — ✅ shipped ([PR #32](https://github.com/monty030395/Enthusiest-ai/pull/32), [#33](https://github.com/monty030395/Enthusiest-ai/pull/33), [#34](https://github.com/monty030395/Enthusiest-ai/pull/34))

The Trade Me Android app won't let you copy a listing's description, so the
share target above still left you taking 4–5 screenshots. Now a shared (or
pasted) listing link goes to `/api/listing`, which fetches that one listing
through the Apify actor
[`blackfalcondata~trademe-scraper`](https://apify.com/blackfalcondata/trademe-scraper)
(~$0.0065/listing) and runs the analysis straight away. It passes along the
description, price (with listing type, auction reserve state, Buy Now and Was
prices), year, make, model and odometer. If the fetch fails for any reason,
or `APIFY_TOKEN` isn't set, it drops back to the old "copy the description"
hint. Verified end to end on 2026-10-23 by sharing from the Trade Me app.

Kept deliberately narrow: one listing, only when the user shares it. It's
still the same automated-fetch risk the price-calibration section warns
about. Trade Me's developer docs say it won't support scraping (its main
member terms weren't checked), and the actor is a third-party
community build that can break or be blocked without warning. Don't widen it
into search or bulk price data without weighing that first.

- ✅ **Rate limiting on `/api/listing`** — Vercel WAF rate-limit rule on the `enthusiest-ai` project, which serves motormind.nz (dashboard → Firewall, not code): request path equals `/api/listing`, 10 requests / 60s per IP, 429. Verified on www.motormind.nz 2026-10-23 (11th request 429s). `enthusiest-ai-zy6l` was a duplicate project that also deployed every push; it is being retired. Blocked requests never reach the function or Apify and aren't billed. Counters are per region, and Hobby allows one rate-limit rule per project. The app shows a specific "give it a minute" hint on a 429.
- ⬜ **Apify spend cap** — set a monthly usage limit in the Apify console so a runaway loop or abuse can't run up a bill.
- ⬜ **If the actor breaks** — `APIFY_TRADEME_ACTOR` swaps in another actor without a code change, but its input and output field names will almost certainly differ (this one wants `startUrls` as plain strings and returns `priceText`), so check its schema first.

## Launch-page "how to add a listing" — ✅ shipped ([PR #39](https://github.com/monty030395/Enthusiest-ai/pull/39))

_The Facebook row has since changed to "Share → Motormind". See the Facebook fetch below._

The launch page used to only say "copy the description from Trade Me and
paste it", even though a shared or pasted Trade Me link now gets fetched for
you. It now has a short guide by source: Trade Me (Android share → Motormind,
or paste the link), Facebook Marketplace (copy the description, or use
screenshots), and anywhere else. There's also a one-line tip on installing
the app so it appears in the Android share menu. A Facebook link that is
shared or pasted no longer silently does nothing. It's kept as the check's
listing link, and a Facebook-specific hint asks for the description.

## Facebook Marketplace fetch via Apify — ✅ shipped ([PR #41](https://github.com/monty030395/Enthusiest-ai/pull/41))

Goal: share a Marketplace listing and have it analysed with no copying, the
same as Trade Me. Facebook gets its own route and actor, not a widening of
the Trade Me one.

**Actor:** Apify's own
[`apify/facebook-marketplace-scraper`](https://apify.com/apify/facebook-marketplace-scraper).
Input is `{ startUrls: [{ url }], resultsLimit, includeListingDetails }`.
Community alternatives exist, such as
[`scraper-engine/facebook-marketplace-scraper`](https://apify.com/scraper-engine/facebook-marketplace-scraper).

**Spike results (2026-10-24, 5 runs, 7 NZ listings, ~US$0.07 total):**

- **No Facebook login or cookies needed.** That was the stop condition, and it
  didn't trigger.
- **A single `/marketplace/item/<id>/` URL works** as a start URL, even
  though the actor's docs only mention search URLs. It returns that one
  listing.
- **9–21s per run**, well inside the 50s sync timeout.
- **Fields:** `listingTitle`, `description.text` (only with
  `includeListingDetails: true`), `listingPrice.amount` + `currency` (NZD),
  `locationText.text`, `condition`, `isSold` / `isPending` / `isLive`,
  `timestamp` (when it was listed), `itemUrl`, `id`.
- **No structured vehicle fields.** Odometer, year, make, model and
  transmission don't come back as their own fields, and
  `listingAttributes` is only "Condition". That information only exists if
  the seller wrote it in the title or description, which is the same text a
  user would copy today. The analysis gets no less than before.
- **Cost:** US$0.0062 per listing + US$0.0062 for the details add-on =
  **US$0.0124 per fetch** on the Free tier. That's about double Trade Me's.
  The account's US$5/month usage limit is already set, so the spend-cap item
  above is covered.
- **Share links:** the Facebook app shares `https://www.facebook.com/share/<code>/`.
  - Passed straight to the actor, it returns an **empty item**, so don't do
    that.
  - A plain server request (`fetch(url, { redirect: "manual" })`, Node's
    default user agent) gets a **302 to `/marketplace/item/<id>/?rdid=…`**,
    so resolve it ourselves first.
  - A browser user agent gets a 400 instead. Don't send a Facebook crawler
    user agent either: it would work, but it impersonates Facebook.
  - Untested: whether Facebook answers the same way from Vercel's IPs, and
    `fb.me` links. Check both on the preview deployment.

**Steps:**

1. ✅ **Spike** — results above.
2. ✅ **Resolve share links** — plain `fetch` with `redirect: "manual"`, read
   `Location`, take the numeric id from `/marketplace/item/<id>`.
3. ✅ **Build** — `/api/listing` takes Facebook links as well
   (`app/_lib/facebookListing.ts`). It resolves the share link, then runs
   the actor on the canonical `/marketplace/item/<id>/` URL with a 42s
   timeout, leaving room for the resolve. The text passed on is title,
   price, status, condition, location, listing date, then the description.
   `$1` "make an offer" prices are dropped. `APIFY_FACEBOOK_ACTOR` swaps in
   another actor. Any failure falls back to `FACEBOOK_HINT` (copy the
   description). Verified locally end to end with a real share link
   (BMW E39 540i, 7.7s).
4. ✅ **Protect it** — no new WAF rule needed. It's the same path, so the
   existing `/api/listing` rule (10 / 60s per IP) covers it.
5. ✅ **Update the guide** — Trade Me and Facebook now share one "Share →
   Motormind / Copy link" row in `ListingHowTo.tsx`.
6. ✅ **Verified in production** (2026-10-24): shared a Marketplace listing
   from the Facebook app on Android to the installed app on motormind.nz, and
   it pulled and analysed. So share links do resolve from Vercel's IPs.
   Pasting a link in a desktop browser works too. Still untested: `fb.me`
   short links, which haven't turned up in a real share yet.
   Testing gotcha: the share sheet always opens the installed app, which
   runs production. A PR preview can't be tested from the share sheet
   unless that preview is installed as its own app.

## Night dash redesign — ✅ shipped

The old look shared too much with other AI-built apps: a near-black
background with one bright accent, Syne/Inter/JetBrains Mono, tracked-out
capitals everywhere, and film grain. The new direction makes Motormind read
like a car's instrument cluster at night. Every control is a piece of car
hardware, lit Optitron-style (black until lit, white-blue glow, red needles),
with a Japanese GT-R-style cluster. Mockups: [Night Dash Kit](https://claude.ai/artifact/C7Z1Xt18BfyGLUm9R8Hxpe)
(the full gadget mapping) and [Cluster Origins](https://claude.ai/artifact/765NgBoxW7irZL8tcjXpL3)
(the Japanese column, without the boost gauge).

| Phase | What | Status |
|---|---|---|
| 1 | The look — petrol-blue/glow tokens, Chakra Petch + Saira + Share Tech Mono, no film grain, push-to-start button, revving tacho loader, Roast Mode behind a flip-up switch guard | ✅ shipped (#43) |
| 2 | The results — three-dial cluster with an ignition sweep, amber multi-function display for driving character, warning lamps for red flags, temperature gauge (reliability), fuel gauge (wallet damage), odometer | ✅ shipped (#44) |
| 3 | Garage key tags; Compare as two clusters side by side, LCD rows-won, indicator lamps, push-to-start "Settle it" | ✅ shipped (#45) |

Follow-ups after phone testing:

- ✅ **Progress visible on share** — [PR #47](https://github.com/monty030395/Enthusiest-ai/pull/47). Sharing a listing used to leave the "Pulling the listing" / "Getting under the hood" card below the fold, so the app looked idle. While a pull or check runs, the hero, how-to and input now fold away so the tacho is at the top. A failed pull scrolls to the "paste the description" hint, and a failed check scrolls to its error.
- ✅ **Dashboard warning lamps** — [PR #47](https://github.com/monty030395/Enthusiest-ai/pull/47). The red flags card opens with the mockup's telltale row: engine, oil, coolant, battery, gearbox and master warning. Each flag is sorted into a system by its wording, and anything that fits no system lights the master warning. A lamp is red when a confirmed flag lights it, amber when only "depends on the variant" flags do, and dark otherwise.
- ✅ **Blank street cred** — [PR #48](https://github.com/monty030395/Enthusiest-ai/pull/48). gpt-4o sometimes returns the street-cred fields as the template's empty strings, which showed as empty Cars & Coffee / Community badges with Owner Vibe missing. A small follow-up call now fills in only the blank fields, using the main prompt's own rule lines, before any roast rewrite. Empty ratings are never drawn. First exercised in production: Vercel logs show `Street cred repaired: true/false` when it fires.
- ✅ **Dash replaces the hero card** — [PR #50](https://github.com/monty030395/Enthusiest-ai/pull/50). The results page still kept much of the old hero card, which clashed with the mockup. The top of a check is now the mockup's dash, sized for one phone screen: the three dials, an amber trip computer (price verdict like "FAIR BUY", asking price, the car), the odometer row, the warning lamps with each flag opening on tap, then the reliability (temperature) and wallet damage (fuel) gauges side by side. Performance specs and the short verdict follow in one card. The separate red flags card and the duplicate gauges in the detail cards are gone. Checked at 390×780 locally; not yet checked on a real phone.
- ✅ **Dials look pressable** — [PR #52](https://github.com/monty030395/Enthusiest-ai/pull/52). As gauges, the three scores no longer looked tappable. Each dial's name now sits on a lit dash switch underneath with a ↓, and the switches glow twice after the ignition sweep the first time results appear on a device (remembered in localStorage, skipped for reduced motion). Section jumps also land below the sticky masthead now instead of under it.
- ✅ **UX quick wins** — [PR #54](https://github.com/monty030395/Enthusiest-ai/pull/54). From a design critique: the failed-check error no longer tells users to check an API key, removing a Garage check shows a 5-second Undo, the "Tally up" controls say "Compare" (the page keeps "The Tally Up" title), the input tab reads "Link or Text", and the action is called "Check" everywhere instead of "Analyse".
- ✅ **Layout pass** — [PR #56](https://github.com/monty030395/Enthusiest-ai/pull/56). The paste box and Start button sit straight under the headline, with the how-to folded into a "How do I add a listing?" link, so the launch screen fits one phone screen. Every card below the dash now uses the dash panel style, section scores sit in a small LCD readout, and Wallet Damage and the Enthusiast Take lost their old one-off looks. No text is under 12px, letter-spacing is capped, and small controls are 44px tall (the dial switches read Invest / Character / Cred to fit). A card under the dash holds the short verdict, Share and a jump to the full take. Checked at 375×740 locally; not yet on a real phone or with a real check.
- ✅ **Compare side by side** — [PR #58](https://github.com/monty030395/Enthusiest-ai/pull/58). The two cars used to stack on phones. They now sit side by side with a VS, and their Invest, Character and Cred dials face each other with a lamp lit beside the winner (those rows leave the table but still count in Rows won). The rest of the table mirrors car B to the right, the tally panels use the dash style, and the masthead tightens below 360px. Shared tally pages get the same layout.
- ✅ **Loading progress** — [PR #60](https://github.com/monty030395/Enthusiest-ai/pull/60). The check's tacho now climbs toward the redline over the expected time (20s, 35s with Roast Mode) and holds there with an idle wobble, instead of blipping on a loop. Listings pulled from Trade Me or Facebook show "Checking: <title>" (pasted text gets no name, since its first line often isn't a title), and a check that runs 8s past the expected time swaps the jokes for a "taking longer than usual" note. Reduced motion parks the needle mid-scale. Tested with stubbed responses; not yet seen on a real check.

Still open from the design critique:

- **Short money readouts** — long verdicts like "Emotionally Justified Disaster" and "Paying the Premium" wrap on the dash gauges. Give the gauges short readouts and keep the full labels on the detail cards.
- **Key-tag hole** — on Garage key tags the round hole looks like a checkbox you can tick. Make it plainly decorative, or make it the Compare toggle.

## Price calibration on appreciating JDM/enthusiast imports — ✅ shipped ([PR #27](https://github.com/monty030395/Enthusiest-ai/pull/27))

Closes [#24](https://github.com/monty030395/Enthusiest-ai/issues/24) (option
A — prompt calibration, measured against real Trade Me prices before and
after). Option B (grounding `priceVerdict` in Trade Me's live published data)
was not attempted — flagged as carrying the same automated-fetch risk that
got the original listing-scraper blocked, worth weighing before anyone builds
it rather than assuming it's safe. These are baked-in 2026 price ranges, not
live data, so **worth re-testing against real Trade Me prices in a year or
two** the same way this one was found and fixed.

## OpenAI rate limit — ✅ handling shipped ([PR #28](https://github.com/monty030395/Enthusiest-ai/pull/28)), ceiling itself has moved

Originally measured 2026-07-26 at **30,000 tokens/minute on GPT-4o**, with one
analysis costing ~7,200 tokens — roughly four analyses/minute across all
users before requests 429'd, surfacing as "The server choked on that one".

Re-measured 2026-07-29 before building the fix: a single analysis call now
costs **~9,900 tokens** (prompt has grown with the engine-ID and
price-calibration additions) and takes **~20 seconds**. More importantly,
**6 concurrent full analyses (~59,000 tokens in a 20s window) all succeeded
with zero 429s** — well past the originally-measured ceiling. Most likely
explanation: OpenAI auto-upgrades usage tiers as an account's cumulative
spend crosses thresholds, and this project has made a lot of real calls since
the original measurement. The ceiling hasn't disappeared, but it's evidently
higher than first measured, and it can move again either direction.

Shipped as insurance regardless, since the underlying shared-budget risk is
real even if today's headroom is bigger than first thought:
- ✅ `maxRetries: 3` set explicitly on both OpenAI clients (analyze, compare) — the SDK already retries 429s automatically, honouring OpenAI's own `Retry-After` header, this just gives it one more attempt
- ✅ `maxDuration` set explicitly on both routes (60s analyze, 30s compare) so those retries have real, documented headroom instead of relying on an unverified platform default
- ✅ A rate-limited request now returns a specific, honest message — *"Motormind's busy right now — give it about 10 seconds and try again"* — instead of being told to check an API key that's perfectly fine
- ✅ **Trim the system prompt** — read the whole thing before cutting anything: almost all of it is hard-won calibration text (engine-ID, price ranges, confidence semantics) validated by real testing this session, so aggressive cuts would re-risk fixed bugs for a saving that matters less now the ceiling turned out higher. Consolidated the one genuinely redundant bit — 7 "be specific, not generic" bullets repeating the same instruction — into one. Saved ~280 characters, re-verified against the Legacy engine-ID and Silvia price-calibration test cases (both still correct). Modest, not dramatic — that's an honest reflection of how little fat is actually in there now.
- ⬜ Re-measure the real ceiling again in a few months the same way this was found — it will keep moving as usage grows.

## Chassis generation attribution (attempted 2026-07-26, parked)

Sellers name the wrong generation and the analysis inherits it (a 1993
Silvia asserting "the S14 generation" straddles the real S13/S14
changeover). A prose instruction had no measurable effect and was reverted.

- ⬜ If revisited: probably needs its own explicit output field (like the `confidence` field that did work for engine attribution) rather than a prose instruction, since a field forces an answer where prose can be skipped.

## Usability backlog

From the post-redesign review (July 2026), roughly in priority order:

- ✅ **Masthead scroll-to-top** — [PR #30](https://github.com/monty030395/Enthusiest-ai/pull/30). Tapping the wordmark or a nav link that targets the page you're already on scrolls to top instead of doing nothing (a same-route `<Link>` click is otherwise a no-op); a link to a different page still navigates as before. Closes [#8](https://github.com/monty030395/Enthusiest-ai/issues/8).
- ✅ **Desktop image paste** — [PR #30](https://github.com/monty030395/Enthusiest-ai/pull/30). Global paste listener detects an image on the clipboard (Win+Shift+S → Ctrl+V) from anywhere on the page, auto-switches to the Screenshots tab, and adds it — verified it doesn't interfere with the existing textarea text-paste/URL-hint flow.
- ✅ **`prefers-reduced-motion`** — [PR #30](https://github.com/monty030395/Enthusiest-ai/pull/30). Standard universal snippet kills animation/transition duration and disables the film grain overlay. Note: doesn't touch the JS-driven `behavior: "smooth"` scrollIntoView/scrollTo calls elsewhere in the app (including the scroll-to-top above) — those would need their own check against the same media query for full coverage.
- ✅ **Contrast pass on `ink-faint`** — [PR #30](https://github.com/monty030395/Enthusiest-ai/pull/30). Measured: 3.66:1 on carbon-950, fails WCAG AA (4.5:1) for the small text it's used on. `#6e6a63` → `#827e76`, now 4.87:1, still clearly darker than `ink-muted` (7.45:1).
- ✅ **Film grain / backdrop-blur perf gate on mobile** — moot: the Night dash redesign ([#43](https://github.com/monty030395/Enthusiest-ai/pull/43)) removed the film grain and the masthead blur.

## Future ideas (not yet scoped)

- ✅ **Roast Mode** — shipped in [PR #38](https://github.com/monty030395/Enthusiest-ai/pull/38) ([spec](docs/superpowers/specs/2026-08-04-roast-mode-design.md), [plan](docs/superpowers/plans/2026-08-04-roast-mode.md)). The toggle lives in the masthead ☰ menu behind a flip-up switch guard, not on the main page, since it's a likely paid extra. Facts and scores always come from the normal serious-voice call. With Roast Mode on, the prose fields go to a second gpt-4.1 rewrite call and are merged back by explicit field path, so scores can't drift between modes. If the rewrite fails, or there isn't time left in `maxDuration`, the result falls back to serious. The toggle is remembered per device, so a listing shared from Trade Me gets roasted if you left it on. Roast checks cost two OpenAI calls.

## Open issues

None right now.

## Closed this cycle

[#6](https://github.com/monty030395/Enthusiest-ai/issues/6) compare · [#7](https://github.com/monty030395/Enthusiest-ai/issues/7) garage · [#8](https://github.com/monty030395/Enthusiest-ai/issues/8) auto-scroll · [#9](https://github.com/monty030395/Enthusiest-ai/issues/9) score drift (tally margin rule, [PR #22](https://github.com/monty030395/Enthusiest-ai/pull/22)) · [#14](https://github.com/monty030395/Enthusiest-ai/issues/14) loading messages · [#17](https://github.com/monty030395/Enthusiest-ai/pull/17) red-flag precision · [#24](https://github.com/monty030395/Enthusiest-ai/issues/24) price calibration · [#10](https://github.com/monty030395/Enthusiest-ai/issues/10) alternatives V3 (won't-do — Trade Me API closed to buyer-side tools)

Also shipped outside any issue: editorial redesign ([#18](https://github.com/monty030395/Enthusiest-ai/pull/18)), engine-variant attribution ([#23](https://github.com/monty030395/Enthusiest-ai/pull/23)), share-target boilerplate fix ([#26](https://github.com/monty030395/Enthusiest-ai/pull/26)), shared-listing fetch via Apify ([#32](https://github.com/monty030395/Enthusiest-ai/pull/32), [#33](https://github.com/monty030395/Enthusiest-ai/pull/33), [#34](https://github.com/monty030395/Enthusiest-ai/pull/34)), Facebook Marketplace fetch ([#41](https://github.com/monty030395/Enthusiest-ai/pull/41)), Night dash redesign ([#43](https://github.com/monty030395/Enthusiest-ai/pull/43), [#44](https://github.com/monty030395/Enthusiest-ai/pull/44), [#45](https://github.com/monty030395/Enthusiest-ai/pull/45)) and its follow-ups ([#47](https://github.com/monty030395/Enthusiest-ai/pull/47), [#48](https://github.com/monty030395/Enthusiest-ai/pull/48), [#50](https://github.com/monty030395/Enthusiest-ai/pull/50), [#52](https://github.com/monty030395/Enthusiest-ai/pull/52), [#54](https://github.com/monty030395/Enthusiest-ai/pull/54), [#56](https://github.com/monty030395/Enthusiest-ai/pull/56), [#58](https://github.com/monty030395/Enthusiest-ai/pull/58), [#60](https://github.com/monty030395/Enthusiest-ai/pull/60)).
