"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { computeCharacterScore } from "../_lib/analysis";
import { type SavedCheck, loadGarage, deleteCheck, clearGarage } from "../_lib/garage";
import { verdictBadgeStyle } from "./badges";
import { Card } from "./ui";
import Masthead from "./Masthead";
import AnalysisResults from "./AnalysisResults";

function scoreColor(score: number | null): string {
  if (score === null) return "text-ink-faint";
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function MiniScore({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-mono text-sm font-bold tabular-nums leading-none ${scoreColor(score)}`}>
        {score ?? "?"}
      </span>
      <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink-faint whitespace-nowrap">{label}</span>
    </div>
  );
}

function checkedOn(savedAt: number): string {
  return new Date(savedAt).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function GarageView() {
  // localStorage is browser-only — load after mount so SSR and first client
  // render agree (empty), then hydrate the real list
  const [checks, setChecks] = useState<SavedCheck[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<SavedCheck | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setChecks(loadGarage());
    setLoaded(true);
  }, []);

  function handleDelete(id: string) {
    setChecks(deleteCheck(id));
    if (selected?.id === id) setSelected(null);
  }

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearGarage();
    setChecks([]);
    setConfirmClear(false);
  }

  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">

      <Masthead active="garage" />

      <main className="max-w-3xl mx-auto px-5 py-10 space-y-6">

        {selected ? (
          <>
            {/* Detail view: one saved check, re-rendered in full */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <button
                onClick={() => setSelected(null)}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint hover:text-ink-muted transition-colors py-2 flex items-center gap-2"
              >
                <span className="text-ember-400">←</span> Back to Garage
              </button>
              <p className="font-mono text-[10px] text-ink-faint">Checked {checkedOn(selected.savedAt)}</p>
            </div>
            <AnalysisResults analysis={selected.analysis} />
          </>
        ) : (
          <>
            {/* List view */}
            <div className="pt-2">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ember-400 mb-4">
                Your saved checks
              </p>
              <h2 className="font-display text-4xl font-extrabold text-ink leading-[1.05] tracking-tight">
                The Garage
              </h2>
              <p className="mt-4 text-ink-muted text-sm leading-relaxed max-w-md">
                Every check saves here automatically — on this device only, nothing uploaded. Tap one to reopen the full read.
              </p>
            </div>

            {loaded && checks.length === 0 && (
              <Card className="p-10 text-center space-y-3">
                <p className="font-display text-ink font-bold text-sm uppercase tracking-[0.12em]">Garage&apos;s empty</p>
                <p className="text-ink-muted text-sm leading-relaxed">
                  Go find something worth arguing about.
                </p>
                <Link
                  href="/"
                  className="inline-block font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ember-400 hover:text-ember-300 transition-colors py-2"
                >
                  Analyse a listing →
                </Link>
              </Card>
            )}

            {checks.length > 0 && (
              <div className="space-y-3">
                {checks.map((check) => {
                  const a = check.analysis;
                  return (
                    <Card key={check.id} className="overflow-hidden">
                      <button
                        onClick={() => { setSelected(check); window.scrollTo({ top: 0 }); }}
                        className="w-full text-left p-5 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint mb-1.5">
                              {a.vehicle.year} · Checked {checkedOn(check.savedAt)}
                            </p>
                            <h3 className="font-display text-xl font-extrabold text-ink tracking-tight leading-tight truncate">
                              {a.vehicle.make} {a.vehicle.model}
                            </h3>
                            {a.vehicle.price && (
                              <p className="font-mono text-ember-400 text-sm font-bold tabular-nums mt-1">{a.vehicle.price}</p>
                            )}
                          </div>
                          <div className="flex gap-3 flex-shrink-0 pt-1">
                            <MiniScore label="Inv" score={a.investmentScore ?? null} />
                            <MiniScore label="Chr" score={computeCharacterScore(a)} />
                            <MiniScore label="Cred" score={a.vibeScore ?? null} />
                          </div>
                        </div>
                        {a.label && (
                          <div className="mt-3">
                            <span style={verdictBadgeStyle(a.label)}>{a.label}</span>
                          </div>
                        )}
                      </button>
                      <div className="border-t border-line px-5 py-2 flex justify-end">
                        <button
                          onClick={() => handleDelete(check.id)}
                          className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-ink-faint hover:text-red-400 transition-colors py-2 px-2 -mr-2"
                        >
                          Remove
                        </button>
                      </div>
                    </Card>
                  );
                })}

                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleClearAll}
                    className={`font-mono text-[10px] font-medium uppercase tracking-[0.2em] transition-colors py-3 px-4 ${
                      confirmClear ? "text-red-400" : "text-ink-faint hover:text-ink-muted"
                    }`}
                  >
                    {confirmClear ? "Tap again to clear the lot" : "Clear Garage"}
                  </button>
                </div>
              </div>
            )}

            <p className="font-mono text-ink-faint text-[10px] leading-relaxed text-center pt-4">
              Checks live in this browser&apos;s storage only — clearing your browser data clears the Garage too.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
