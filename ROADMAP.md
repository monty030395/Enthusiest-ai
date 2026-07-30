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
done. **V3 (live Trade Me listings via their API) is blocked on Trade Me API
production approval** — a business/access step, not a coding task. Worth
deciding whether it's still wanted now that V2's search links cover most of
the value without needing that approval at all.

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
- ⬜ **Trim the system prompt** — now comfortably over 27,500 characters; cutting it lowers cost per call and rate-limit pressure together. Still worth doing.
- ⬜ Re-measure the real ceiling again in a few months the same way this was found — it will keep moving as usage grows.

## Chassis generation attribution (attempted 2026-07-26, parked)

Sellers name the wrong generation and the analysis inherits it (a 1993
Silvia asserting "the S14 generation" straddles the real S13/S14
changeover). A prose instruction had no measurable effect and was reverted.

- ⬜ If revisited: probably needs its own explicit output field (like the `confidence` field that did work for engine attribution) rather than a prose instruction, since a field forces an answer where prose can be skipped.

## Usability backlog

From the post-redesign review (July 2026), roughly in priority order:

- ⬜ **Masthead scroll-to-top** — results run 6+ screens; score chips jump down but nothing brings you back. Tapping the sticky masthead should scroll to top. Related: [#8](https://github.com/monty030395/Enthusiest-ai/issues/8).
- ⬜ **Desktop image paste** — Win+Shift+S → Ctrl+V should add a screenshot on the Screenshots tab; paste handling currently only exists on the textarea.
- ⬜ **`prefers-reduced-motion`** — pulse dot, spinner, and film grain should respect it.
- ⬜ **Contrast pass on `ink-faint`** — 9–10px mono labels at #6e6a63 on carbon are borderline where they carry real information (disclaimers).
- ⬜ **Film grain / backdrop-blur perf gate on mobile** — test on mid-range Android before investing further.

## Future ideas (not yet scoped)

- ⬜ **Roast Mode** — Monty wants to come back to this. No scope/details captured yet; flesh out when picked up.

## Open issues

- [#10](https://github.com/monty030395/Enthusiest-ai/issues/10) — alternatives V3, blocked on Trade Me API approval (see above)

## Closed this cycle

[#6](https://github.com/monty030395/Enthusiest-ai/issues/6) compare · [#7](https://github.com/monty030395/Enthusiest-ai/issues/7) garage · [#8](https://github.com/monty030395/Enthusiest-ai/issues/8) auto-scroll · [#9](https://github.com/monty030395/Enthusiest-ai/issues/9) score drift (tally margin rule, [PR #22](https://github.com/monty030395/Enthusiest-ai/pull/22)) · [#14](https://github.com/monty030395/Enthusiest-ai/issues/14) loading messages · [#17](https://github.com/monty030395/Enthusiest-ai/pull/17) red-flag precision · [#24](https://github.com/monty030395/Enthusiest-ai/issues/24) price calibration

Also shipped outside any issue: editorial redesign ([#18](https://github.com/monty030395/Enthusiest-ai/pull/18)), engine-variant attribution ([#23](https://github.com/monty030395/Enthusiest-ai/pull/23)), share-target boilerplate fix ([#26](https://github.com/monty030395/Enthusiest-ai/pull/26)).
