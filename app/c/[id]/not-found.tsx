import Link from "next/link";
import Masthead from "../../_components/Masthead";
import { Card } from "../../_components/ui";
import { SHARE_TTL_DAYS } from "../../_lib/shared";

export default function SharedCheckNotFound() {
  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">
      <Masthead />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <Card className="p-10 text-center space-y-4">
          <p className="font-display text-ink font-bold text-sm uppercase tracking-[0.12em]">
            That link&apos;s gone cold
          </p>
          <p className="text-ink-muted text-sm leading-relaxed">
            Shared checks are removed after {SHARE_TTL_DAYS} days — ask whoever sent it to run a fresh one,
            or check the car yourself.
          </p>
          <Link
            href="/"
            className="inline-block font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ember-400 hover:text-ember-300 transition-colors py-2"
          >
            Check a listing →
          </Link>
        </Card>
      </main>
    </div>
  );
}
