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

## Launch-page "how to add a listing" — 🔨 in review

The launch page used to only say "copy the description from Trade Me and
paste it", even though a shared or pasted Trade Me link now gets fetched for
you. It now has a short guide by source: Trade Me (Android share → Motormind,
or paste the link), Facebook Marketplace (copy the description, or use
screenshots), and anywhere else. There's also a one-line tip on installing
the app so it appears in the Android share menu. A Facebook link that is
shared or pasted no longer silently does nothing. It's kept as the check's
listing link, and a Facebook-specific hint asks for the description.

## Facebook Marketplace fetch via Apify — ⬜ not started (plan)

Goal: share a Marketplace listing and have it analysed with no copying, the
same as Trade Me. Facebook gets its own route and actor, not a widening of
the Trade Me one.

**What exists (checked 2026-10-24):** Apify's own
[`apify/facebook-marketplace-scraper`](https://apify.com/apify/facebook-marketplace-scraper)
(~$2.60–6.20 per 1,000 listings depending on plan, so under a cent each)
plus community actors such as
[`scraper-engine/facebook-marketplace-scraper`](https://apify.com/scraper-engine/facebook-marketplace-scraper).
They're built around **location, category and search URLs**. A single
`/marketplace/item/<id>` URL isn't documented as an input. The description
only comes with `includeListingDetails` (or a "deep scrape" flag on the
community ones). Vehicle fields like odometer aren't promised either and may
only appear inside the generic listing attributes.

**Steps:**

1. **Spike (manual, Apify console, ~$0):** run the official actor on 3–4 real
   NZ car listings, passing the item URL as the start URL with
   `includeListingDetails: true`. Record whether it accepts an item URL,
   whether it needs Facebook cookies, run time (it must fit inside the 50s
   sync timeout), and which fields come back (description, price, odometer,
   year, location). If it rejects item URLs, try the community actors before
   giving up.
2. **Resolve share links:** the Facebook app shares `facebook.com/share/<code>`
   or `fb.me` short links. Check whether the actor follows them; if not,
   resolve the redirect server-side to get the `/marketplace/item/<id>` URL
   and the numeric id.
3. **Build:** `/api/listing/facebook` (or a `source` branch in
   `/api/listing`) with its own `APIFY_FACEBOOK_ACTOR` env var and a
   `listingToText` mapper for that actor's fields. In `page.tsx`, send a
   Facebook link to `pullListing` instead of showing `FACEBOOK_HINT`. Keep
   the hint as the fallback for any failure, as Trade Me does.
4. **Protect it:** extend the WAF rate-limit rule to cover the new path (Hobby
   allows one rule per project, so use a path prefix match on `/api/listing`),
   and make sure the Apify spend cap above is set first.
5. **Update the guide:** change the Facebook row in `ListingHowTo.tsx` to
   "Share → Motormind", and note the copy-description route as the fallback.

**Risks — weigh before step 3:** Meta's terms prohibit automated collection
without permission, and Meta actively blocks and litigates scrapers. Apify
recommends residential proxies because datacenter IPs get blocked quickly, so
expect it to break more often than the Trade Me actor. If the spike needs
Facebook login cookies, **stop**: that puts a real account at risk and is a
much bigger terms problem. In that case the copy-description route stays the
answer. Same narrow scope as Trade Me: one listing, only when the user
shares it.

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
- ⬜ **Film grain / backdrop-blur perf gate on mobile** — test on mid-range Android before investing further.

## Future ideas (not yet scoped)

- 🔨 **Roast Mode** — built on `feature/roast-mode` ([spec](docs/superpowers/specs/2026-08-04-roast-mode-design.md), [plan](docs/superpowers/plans/2026-08-04-roast-mode.md)), in review. A toggle on the analyse screen. Facts and scores always come from the normal serious-voice call. With Roast Mode on, the prose fields go to a second gpt-4.1 rewrite call and are merged back by explicit field path, so scores can't drift between modes. If the rewrite fails, or there isn't time left in `maxDuration`, the result falls back to serious. The toggle is remembered per device, so a listing shared from Trade Me gets roasted if you left it on. Roast checks cost two OpenAI calls.

## Open issues

None right now.

## Closed this cycle

[#6](https://github.com/monty030395/Enthusiest-ai/issues/6) compare · [#7](https://github.com/monty030395/Enthusiest-ai/issues/7) garage · [#8](https://github.com/monty030395/Enthusiest-ai/issues/8) auto-scroll · [#9](https://github.com/monty030395/Enthusiest-ai/issues/9) score drift (tally margin rule, [PR #22](https://github.com/monty030395/Enthusiest-ai/pull/22)) · [#14](https://github.com/monty030395/Enthusiest-ai/issues/14) loading messages · [#17](https://github.com/monty030395/Enthusiest-ai/pull/17) red-flag precision · [#24](https://github.com/monty030395/Enthusiest-ai/issues/24) price calibration · [#10](https://github.com/monty030395/Enthusiest-ai/issues/10) alternatives V3 (won't-do — Trade Me API closed to buyer-side tools)

Also shipped outside any issue: editorial redesign ([#18](https://github.com/monty030395/Enthusiest-ai/pull/18)), engine-variant attribution ([#23](https://github.com/monty030395/Enthusiest-ai/pull/23)), share-target boilerplate fix ([#26](https://github.com/monty030395/Enthusiest-ai/pull/26)), shared-listing fetch via Apify ([#32](https://github.com/monty030395/Enthusiest-ai/pull/32), [#33](https://github.com/monty030395/Enthusiest-ai/pull/33), [#34](https://github.com/monty030395/Enthusiest-ai/pull/34)).
