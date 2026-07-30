# Landing → Results concept

Status: **exploratory design, not approved for implementation.** Liked directionally, but not confirmed — next step is a working demo wired into the real app (not another static mockup) before committing further.

## Open `mockup.html` directly in a browser to view it

Self-contained, no server needed — fonts and everything else are inlined. If you edit `mockup-template.html`, run `node build.js` from this directory to regenerate `mockup.html` (needs the three `.woff2` files in `fonts/`, already committed here).

## The core idea

`/` today is the tool itself: a two-line hero bolted directly on top of the input form (see `app/page.tsx`). It *tells* a first-time visitor the analysis is honest and specific — it never *shows* them. The concept's job is to prove that before asking for anything, by demonstrating the product live on a real-feeling listing rather than describing it in adjectives.

Landing and results are **not two pages** — they're one continuous scroll under one masthead, at the app's real column width (720px), because that's how the app already behaves (input collapses, results appear below, same page). The mockup is structured to match that:

1. Headline + subhead
2. **Signature: an annotated listing.** A mock Trade Me listing (1998 Nissan Silvia S15 Spec R) with margin notes in the app's real verdict colors — "Translation" (tactical/amber-ember read) and "Red Flag" (red) — demonstrating what the product actually does instead of asserting it.
3. The annotation sequence resolves: a brief "Weighing it up..." beat (in the app's real rotating-loading-message voice), then a verdict badge (**Money Pit**) stamps into the bottom of the card.
4. **The real input card** — Paste Text / Screenshots tabs, empty textarea, "Analyse Listing" button shown genuinely disabled (matches `canAnalyse` in `page.tsx`). This is the actual functional control, clearly separated from the demo above it by a small "Paste your own" label. The demo card is fixed marketing content, not an editable field — it doesn't pretend to be the input.
5. A "seam" divider ("Analysed — results below, same scroll") — standing in for what really happens once you submit.
6. **Results excerpt** for the same Silvia S15: hero tile (vehicle header, price, label + owner-vibe badges, pull-quote, verdict line, performance specs, score chips), then the real 01/02/03 sectioning (Investment: Price Analysis, Enthusiast Tax, Red Flags, Wallet Damage Rating, Future Classic Potential; Character: Why Enthusiasts Care, Driving Character; Street Cred: Owner Vibe, Regret Risk), Spec Significance, Ask the Seller, The Enthusiast Take, Share button. Explicitly labeled as an excerpt (Mod Potential, Community Credibility, Alternatives exist in the real app but aren't shown here).

**Continuity is the point:** the Owner Vibe badge in the results ("Motivated Seller") pays off the hero's "Translation" annotation. The Red Flags card reuses the same red/annotation language as the hero. The hero's verdict stamp ("Money Pit") is the same label the results hero tile shows. It's one argument, not a landing pitch followed by an unrelated app screen.

## Design tokens (all pulled from the existing shipped app — nothing invented)

- **Color:** `app/globals.css` — carbon-950/900/850/800 (surfaces), ink/ink-muted/ink-faint (text), ember-300/400/500/600 (accent). Verdict sentiment colors (red/amber/green/blue) from `app/_components/badges.tsx`.
- **Type:** Syne (display), Inter (body), JetBrains Mono (labels/data) — the app's real `next/font` families, embedded here as actual `.woff2` data URIs (see `fonts/`), not a font-CDN approximation.
- **Single dark theme, deliberately** — the shipped app has no light mode; this doesn't invent one either.

## What was tried and cut (don't re-litigate these without a new reason)

Four hero mechanisms were compared side by side (via a visual brainstorming pass):

- **A — Annotated listing** (kept, described above)
- **B — Verdict reveal**: the app's real loading copy cycling into a verdict badge (kept, folded into A as the closing beat)
- **C — Two listings, two outcomes side by side** (Hidden Gem vs. Money Pit): liked less than A/B. Tried folding in as a small footnote ("Two we checked this week — ...") — rejected as confusing, partly because it reused the hero's own demo car, partly because "this week" implied real usage data that doesn't exist. Cut entirely.
- **D — Quote-led hero** (a giant brand-voice pull-quote, e.g. "Every listing is trying to sell you something. We're not."): liked as a concept, tried as a standalone section between hero and results — rejected as breaking the one-scroll flow and reading as an abstract, salesman-like claim rather than something grounded. Cut entirely. (The results excerpt's own "Enthusiast Take" quote, which *is* grounded in the specific car, was judged sufficient to carry the product's voice.)
- A one-line "built for NZ" footnote (grey imports / compliance / Trade Me specifics) was also tried and cut — didn't earn its place either.

The throughline in all four cuts: anything that reads as an assertion rather than a demonstration, or that repeats/contradicts something the demo already showed, got removed. Keep applying that filter to future additions.

## Known open question

The mockup proves the *visual* concept but hasn't been tested as a working page — real state transitions (paste → loading → collapse → results), real scroll behavior, real disabled/enabled button states beyond the static "empty" snapshot shown here. That's the next step: a working branch wiring this into `app/page.tsx` (or a copy of it) with the actual `analyse()` flow, not another static HTML file.
