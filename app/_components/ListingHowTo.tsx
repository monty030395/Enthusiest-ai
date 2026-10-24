// How to get a listing into the analyser, by where it's listed. Trade Me
// and Facebook Marketplace links get fetched for you (see /api/listing);
// copying the description is the fallback when a fetch fails.
const SOURCES: { name: string; steps: React.ReactNode[] }[] = [
  {
    name: "Trade Me or Facebook Marketplace",
    steps: [
      <>
        <span className="text-ink">Android:</span> tap <span className="text-ink">Share</span> on the listing and pick{" "}
        <span className="text-ink">Motormind</span>. We pull the listing and start the check.
      </>,
      <>
        <span className="text-ink">iPhone or computer:</span> tap Share, then <span className="text-ink">Copy link</span>, and
        paste it in the box above.
      </>,
      <>
        If we can&apos;t pull it, we&apos;ll ask you to copy the listing&apos;s description in instead, or use screenshots.
      </>,
    ],
  },
  {
    name: "Anywhere else",
    steps: [<>Paste the listing text, or upload screenshots of it.</>],
  },
];

// Folded away under the input: returning users never need it, and open it
// would push Start off the first phone screen
export default function ListingHowTo() {
  return (
    <details className="group rounded-xl bg-dial/60 ring-1 ring-line">
      <summary className="flex items-center justify-between gap-3 px-5 min-h-12 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-display text-sm font-semibold text-glow-400">How do I add a listing?</span>
        <span className="text-ink-faint text-xs transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
      </summary>
      <div className="px-5 pb-5 space-y-4">
      <ul className="space-y-4">
        {SOURCES.map((source) => (
          <li key={source.name} className="border-l-2 border-glow-500/60 pl-3.5">
            <div className="space-y-1">
              <p className="font-display text-sm font-bold text-ink">{source.name}</p>
              {source.steps.map((step, j) => (
                <p key={j} className="text-sm text-ink-muted leading-relaxed">{step}</p>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-faint leading-relaxed">
        No Motormind in your Android share menu? Open motormind.nz in Chrome, tap ⋮ then{" "}
        <span className="text-ink-muted">Add to Home screen</span> (or Install app). It shows up after that.
      </p>
      </div>
    </details>
  );
}
