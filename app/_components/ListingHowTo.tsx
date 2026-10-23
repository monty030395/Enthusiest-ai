// How to get a listing into the analyser, by where it's listed. Trade Me
// links get fetched for you (see /api/listing); Facebook Marketplace can't
// be, so that row is honest about needing the description copied.
const SOURCES: { name: string; steps: React.ReactNode[] }[] = [
  {
    name: "Trade Me",
    steps: [
      <>
        <span className="text-ink">Android:</span> tap <span className="text-ink">Share</span> on the listing and pick{" "}
        <span className="text-ink">Motormind</span>. We pull the listing and start the check.
      </>,
      <>
        <span className="text-ink">iPhone or computer:</span> copy the listing link and paste it in the box below.
      </>,
    ],
  },
  {
    name: "Facebook Marketplace",
    steps: [
      <>
        Facebook won&apos;t let us open the listing, so copy the <span className="text-ink">description</span> instead:
        tap <span className="text-ink">See more</span>, press and hold the text, select it all and copy it, then paste it below.
      </>,
      <>Or take screenshots and use the Screenshots tab.</>,
    ],
  },
  {
    name: "Anywhere else",
    steps: [<>Paste the listing text, or upload screenshots of it.</>],
  },
];

export default function ListingHowTo() {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-5 space-y-4">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-ember-400">
        How to add a listing
      </p>
      <ul className="space-y-4">
        {SOURCES.map((source) => (
          <li key={source.name} className="border-l-2 border-ember-500/60 pl-3.5">
            <div className="space-y-1">
              <p className="font-display text-sm font-bold text-ink">{source.name}</p>
              {source.steps.map((step, j) => (
                <p key={j} className="text-sm text-ink-muted leading-relaxed">{step}</p>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
        No Motormind in your Android share menu? Open motormind.nz in Chrome, tap ⋮ then{" "}
        <span className="text-ink-muted">Add to Home screen</span> (or Install app). It shows up after that.
      </p>
    </div>
  );
}
