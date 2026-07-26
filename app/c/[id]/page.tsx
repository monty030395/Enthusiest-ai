import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { tallyUp } from "../../_lib/compare";
import { getShared } from "../../_lib/shareStore";
import { sharedTitle, SHARE_TTL_DAYS } from "../../_lib/shared";
import Masthead from "../../_components/Masthead";
import AnalysisResults from "../../_components/AnalysisResults";
import { TallyBoard, HeadToHeadCard } from "../../_components/TallyPanels";

// Fetched by both generateMetadata and the page — cache so it's one read
const load = cache(getShared);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const payload = await load((await params).id);
  if (!payload) return { title: "Check not found — Motormind" };

  const title = sharedTitle(payload);
  const description =
    payload.kind === "check"
      ? payload.analysis.verdict || `An enthusiast's read on this ${payload.analysis.vehicle.make}.`
      : "Two cars, ten rows, one winner — tallied by Motormind.";

  return {
    title: `${title} — Motormind`,
    description,
    openGraph: { title: `${title} — Motormind`, description, type: "article" },
    twitter: { card: "summary_large_image", title: `${title} — Motormind`, description },
  };
}

export default async function SharedCheckPage({ params }: Props) {
  const payload = await load((await params).id);
  if (!payload) notFound();

  const sharedOn = new Date(payload.sharedAt).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">
      <Masthead />

      <main className="max-w-3xl mx-auto px-5 py-10 space-y-6">

        {/* Shared banner — makes it obvious this is someone else's check */}
        <div className="rounded-xl border border-line bg-white/[0.02] px-5 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-ember-400">
              Shared {payload.kind === "check" ? "check" : "tally"}
            </p>
            <p className="font-mono text-[10px] text-ink-faint mt-1">Run on {sharedOn}</p>
          </div>
          <Link
            href="/"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted hover:text-ink transition-colors py-2"
          >
            Check your own →
          </Link>
        </div>

        {payload.kind === "check" ? (
          <AnalysisResults analysis={payload.analysis} showShare={false} />
        ) : (
          <div className="space-y-4">
            <div className="pt-1">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ember-400 mb-3">
                Head to head
              </p>
              <h2 className="font-display text-4xl font-extrabold text-ink leading-[1.05] tracking-tight">
                The Tally Up
              </h2>
            </div>
            <TallyBoard a={payload.a} b={payload.b} tally={tallyUp(payload.a, payload.b)} />
            {payload.h2h && <HeadToHeadCard a={payload.a} b={payload.b} h2h={payload.h2h} />}
          </div>
        )}

        {/* Closing CTA — this page is the shop window */}
        <div className="rounded-xl bg-carbon-900 border border-line-strong overflow-hidden">
          <div className="bg-ember-500 px-5 py-3 flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-carbon-950/50" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-carbon-950">
              Your turn
            </span>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-ink leading-relaxed text-[15px]">
              Motormind reads a Trade Me listing like an enthusiast who&apos;s owned one — the faults worth
              budgeting for, whether the asking price is a joke, and what to ask the seller.
            </p>
            <Link
              href="/"
              className="block w-full text-center bg-ember-500 hover:bg-ember-400 active:bg-ember-600 text-carbon-950 font-mono font-bold uppercase tracking-[0.22em] rounded-lg py-4 transition-all text-xs"
            >
              Check a Listing — Free
            </Link>
          </div>
        </div>

        <p className="font-mono text-ink-faint text-[10px] leading-relaxed text-center">
          Shared links are public to anyone who has them and are removed after {SHARE_TTL_DAYS} days.
        </p>
      </main>
    </div>
  );
}
