# Motormind Roadmap

Working plan for where the app goes next. Phases are ordered so each one is
shippable on its own. Status: ✅ done · 🔨 in progress · ⬜ not started.

## Garage & Compare (the "tally up")

The core insight: results used to be ephemeral — one refresh and a check was
gone. Saving every check locally fixes that *and* is the foundation for
comparison. Storage is localStorage, device-only, which keeps the privacy
policy honest (nothing uploaded, no accounts).

| Phase | What | Status |
|---|---|---|
| 0 | **Component refactor** — extract the results view (`AnalysisResults`), badge/theme system, shared UI, and Masthead out of `page.tsx` so saved checks and compare views can reuse the same rendering | 🔨 this branch |
| 1 | **The Garage** — auto-save every completed check to localStorage (`app/_lib/garage.ts`), Garage page with list/reopen/remove/clear, masthead nav, privacy policy updated for device-only storage | 🔨 this branch |
| 2 | **Compare: tally table** — select two checks in the Garage → side-by-side rows (Investment / Character / Street Cred, price, enthusiast tax, reliability pain, wallet damage, classic potential) with per-row winner highlighting and a totted-up score. Pure client-side, no API cost. Closes [#6](https://github.com/monty030395/Enthusiest-ai/issues/6) with Phase 3. | 🔨 this branch |
| 3 | **Compare: head-to-head** — new `/api/compare` route takes two saved analysis JSONs, returns a verdict in the app's voice: which one to buy, the deal-breaker each way, the "if it were my money" call. One API call per head-to-head, cached per pair per session. | 🔨 this branch |
| 4 | **Export / import / share** — export a check as JSON, import a mate's check into your Garage (cross-device tally), "Share verdict" button using the Web Share API (car, price, scores, one-liner, red-flag count). | 🔨 this branch |

Phase 1 also closes out the core of [#7 (virtual garage / saved analyses)](https://github.com/monty030395/Enthusiest-ai/issues/7).

## Usability backlog

From the post-redesign review (July 2026), roughly in priority order:

- ⬜ **Masthead scroll-to-top** — results run 6+ screens; score chips jump down but nothing brings you back. Tapping the sticky masthead should scroll to top (standard mobile contract). Stretch: mini score chips in the masthead once scrolled past the hero. Related: [#8](https://github.com/monty030395/Enthusiest-ai/issues/8).
- ⬜ **Desktop image paste** — Win+Shift+S → Ctrl+V should add a screenshot on the Screenshots tab; paste handling currently only exists on the textarea.
- ⬜ **Listing provenance** — optional Trade Me link field stored with each check (`SavedCheck.listingUrl` already exists in the type) so you can get back to the listing from the Garage.
- ⬜ **`prefers-reduced-motion`** — pulse dot, spinner, and film grain should respect it.
- ⬜ **Contrast pass on `ink-faint`** — 9–10px mono labels at #6e6a63 on carbon are borderline where they carry real information (disclaimers).
- ⬜ **Film grain / backdrop-blur perf gate on mobile** — deferred from the redesign review; test on mid-range Android before investing.

## Known issues / open questions

- [#9](https://github.com/monty030395/Enthusiest-ai/issues/9) — inconsistent results on repeated analysis of the same listing. Garage makes this more visible (two checks of the same car can disagree); worth a temperature/prompt pass.
- [#10](https://github.com/monty030395/Enthusiest-ai/issues/10) — alternative car suggestions: the "You Might Also Consider" card exists; issue may be closable or repurposed for making alternatives tappable (pre-fill a compare?).
- [#14](https://github.com/monty030395/Enthusiest-ai/issues/14) — rotating loading messages: shipped in the redesign; close after verifying it matches the intent.

## Done

- ✅ Editorial dark theme redesign — ember accent, token system, Syne/Inter/JetBrains Mono ([PR #18](https://github.com/monty030395/Enthusiest-ai/pull/18))
- ✅ Design-review hardening — signal-colour integrity, 375px wrapping, touch targets, dead scraper code removed (PR #18)
- ✅ Client-side screenshot compression — fixed phone uploads 413ing on Vercel's 4.5 MB body limit (PR #18)
