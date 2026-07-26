"use client";

import { useState } from "react";
import { type SavedCheck } from "../_lib/garage";
import { tallyUp, fetchHeadToHead, buildTallyShareText, type HeadToHead } from "../_lib/compare";
import { shareOrCopy, createShareLink } from "../_lib/share";
import { V_RED } from "./badges";
import { Card, WheelSpinner } from "./ui";
import { TallyBoard, HeadToHeadCard } from "./TallyPanels";

// One head-to-head per pair per session — don't re-spend the API call when
// the user bounces between list and compare
const h2hCache = new Map<string, HeadToHead>();

// Side-by-side tally of two saved checks. The table is free; the head-to-head
// costs one API call.
export default function CompareView({ a, b, onBack }: { a: SavedCheck; b: SavedCheck; onBack: () => void }) {
  const cacheKey = `${a.id}::${b.id}`;
  const [h2h, setH2h] = useState<HeadToHead | null>(() => h2hCache.get(cacheKey) ?? null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [h2hError, setH2hError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState("");

  const tally = tallyUp(a.analysis, b.analysis);

  async function settleIt() {
    setH2hError("");
    setH2hLoading(true);
    try {
      const result = await fetchHeadToHead(a.analysis, b.analysis);
      h2hCache.set(cacheKey, result);
      setH2h(result);
    } catch (err) {
      setH2hError(err instanceof Error ? err.message : "The head-to-head fell over — give it another go.");
    } finally {
      setH2hLoading(false);
    }
  }

  async function shareTally() {
    setSharing(true);
    setShareNote("");
    const text = buildTallyShareText(a.analysis, b.analysis, tally, h2h);
    // A link lets them see the real thing; text alone is the fallback
    const link = await createShareLink({ kind: "tally", a: a.analysis, b: b.analysis, h2h });
    setSharing(false);
    const outcome = await shareOrCopy(text, link ?? undefined);
    if (outcome === "shared" || outcome === "cancelled") return;
    setShareNote(
      outcome === "copied"
        ? link ? "Link copied — paste it in the group chat." : "Copied — paste it in the group chat."
        : "Couldn't share from here — screenshot the tally instead."
    );
    setTimeout(() => setShareNote(""), 4000);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint hover:text-ink-muted transition-colors py-2 flex items-center gap-2"
      >
        <span className="text-ember-400">←</span> Back to Garage
      </button>

      <div className="pt-1">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ember-400 mb-3">
          Head to head
        </p>
        <h2 className="font-display text-4xl font-extrabold text-ink leading-[1.05] tracking-tight">
          The Tally Up
        </h2>
      </div>

      <TallyBoard a={a.analysis} b={b.analysis} tally={tally} />

      {/* ── SETTLE IT: AI head-to-head ──────────────────── */}
      {!h2h && !h2hLoading && (
        <Card className="p-6 space-y-4">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint mb-2">Still arguing?</p>
            <p className="text-ink-muted text-sm leading-relaxed">
              The tally counts rows. The head-to-head has opinions — the strongest case for each car, the deal-breakers, and a straight call on where the money goes.
            </p>
          </div>
          {h2hError && (
            <div className="flex gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: V_RED.bg, border: `1px solid ${V_RED.border}` }}>
              <span className="flex-shrink-0 font-bold" style={{ color: V_RED.text }}>!</span>
              <p className="text-sm leading-relaxed" style={{ color: V_RED.text }}>{h2hError}</p>
            </div>
          )}
          <button
            onClick={settleIt}
            className="w-full bg-ember-500 hover:bg-ember-400 active:bg-ember-600 text-carbon-950 font-mono font-bold uppercase tracking-[0.22em] rounded-lg py-4 transition-all text-xs"
          >
            Settle It — Head-to-Head
          </button>
        </Card>
      )}

      {h2hLoading && (
        <Card className="p-10 flex flex-col items-center gap-5">
          <WheelSpinner />
          <p className="font-display text-ink font-bold text-sm uppercase tracking-[0.12em]">Settling the Argument</p>
          <p className="font-mono text-ink-muted text-xs -mt-3">Steel-manning both sides...</p>
        </Card>
      )}

      {h2h && <HeadToHeadCard a={a.analysis} b={b.analysis} h2h={h2h} />}

      {/* Share — sends a link to the real page, head-to-head included */}
      <div className="space-y-2">
        <button
          onClick={shareTally}
          disabled={sharing}
          className="w-full border border-ember-600/50 hover:border-ember-500 disabled:border-line disabled:text-ink-faint text-ember-400 hover:text-ember-300 rounded-lg py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] transition-all"
        >
          {sharing ? "Building the link..." : h2h ? "Share the Head-to-Head" : "Share the Tally"}
        </button>
        {shareNote && (
          <p className="font-mono text-[10px] text-ink-faint text-center">{shareNote}</p>
        )}
      </div>

      <p className="font-mono text-ink-faint text-[10px] leading-relaxed text-center">
        Row wins only count where both checks have the data. Asking price is shown but never scored — cheaper isn&apos;t better, it&apos;s just cheaper.
      </p>
    </div>
  );
}
