"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { computeCharacterScore } from "../_lib/analysis";
import { type SavedCheck, useGarage, deleteCheck, restoreCheck, clearGarage, exportCheck, importCheck } from "../_lib/garage";
import { verdictBadgeStyle, RoastBadge } from "./badges";
import { Card } from "./ui";
import { MiniCluster } from "./gauges";
import Masthead from "./Masthead";
import AnalysisResults from "./AnalysisResults";
import CompareView from "./CompareView";

// The eyelet of a key tag with the key ring through it. Purely decorative,
// with no picked state, so it can't be mistaken for a tick box.
function TagHole() {
  return (
    <svg aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" className="block">
      {/* the split ring, coming in from off the tag's left edge */}
      <path d="M-2 9 A16 16 0 0 1 26 22" fill="none" stroke="#2c3a44" strokeWidth="2.5" strokeLinecap="round" />
      {/* metal eyelet */}
      <circle cx="26" cy="22" r="6" fill="#060c10" stroke="#3d4d59" strokeWidth="2.5" />
      <path d="M-2 35 A16 16 0 0 0 26 22" fill="none" stroke="#3a4a55" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
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
  // Null until hydrated — see useGarage. Writes below (delete, clear,
  // import) update it on their own.
  const stored = useGarage();
  const checks = stored ?? [];
  const loaded = stored !== null;
  const [selected, setSelected] = useState<SavedCheck | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Tally Up selection: up to two check ids; picking a third swaps out the oldest pick
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [importError, setImportError] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  // The last removed check, kept a few seconds so Remove can be undone.
  // Checks only live on this device, so a mis-tap would otherwise lose one
  const [removed, setRemoved] = useState<{ check: SavedCheck; index: number } | null>(null);
  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 5000);
    return () => clearTimeout(t);
  }, [removed]);

  function handleDelete(id: string) {
    const index = checks.findIndex((c) => c.id === id);
    if (index !== -1) setRemoved({ check: checks[index], index });
    deleteCheck(id);
    setCompareIds((prev) => prev.filter((c) => c !== id));
    if (selected?.id === id) setSelected(null);
  }

  function handleUndo() {
    if (!removed) return;
    restoreCheck(removed.check, removed.index);
    setRemoved(null);
  }

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearGarage();
    setCompareIds([]);
    setConfirmClear(false);
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id].slice(-2)
    );
  }

  function handleExport(check: SavedCheck) {
    const { filename, json } = exportCheck(check);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const updated = importCheck(await file.text());
    if (updated) {
      setImportError("");
    } else {
      setImportError("That file isn't a Motormind check — export one from a Garage on another device and try again.");
      setTimeout(() => setImportError(""), 5000);
    }
  }

  const comparePair = compareIds
    .map((id) => checks.find((c) => c.id === id))
    .filter((c): c is SavedCheck => !!c);

  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">

      <Masthead active="garage" />

      <main className="max-w-3xl mx-auto px-5 py-10 space-y-6">

        {comparing && comparePair.length === 2 ? (
          <CompareView a={comparePair[0]} b={comparePair[1]} onBack={() => setComparing(false)} />
        ) : selected ? (
          <>
            {/* Detail view: one saved check, re-rendered in full */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <button
                onClick={() => setSelected(null)}
                className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-faint hover:text-ink-muted transition-colors min-h-11 flex items-center gap-2"
              >
                <span className="text-glow-400">←</span> Back to Garage
              </button>
              <div className="flex items-center gap-3">
                <p className="font-mono text-xs text-ink-faint">Checked {checkedOn(selected.savedAt)}</p>
                {selected.listingUrl && (
                  <a
                    href={selected.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors min-h-11 inline-flex items-center"
                  >
                    Listing ↗
                  </a>
                )}
                <button
                  onClick={() => handleExport(selected)}
                  className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-glow-400 hover:text-glow-300 transition-colors min-h-11 inline-flex items-center"
                >
                  Export
                </button>
              </div>
            </div>
            <AnalysisResults analysis={selected.analysis} />
          </>
        ) : (
          <>
            {/* List view */}
            <div className="pt-2">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-glow-400 mb-4">
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
                  className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-glow-400 hover:text-glow-300 transition-colors min-h-11 inline-flex items-center"
                >
                  Check a listing →
                </Link>
                <p className="font-mono text-xs text-ink-faint">
                  or{" "}
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="text-ink-muted hover:text-ink underline underline-offset-2 decoration-glow-500/50 py-2"
                  >
                    import a mate&apos;s check
                  </button>
                </p>
              </Card>
            )}

            {checks.length > 0 && (
              <div className="space-y-3">
                {checks.map((check) => {
                  const a = check.analysis;
                  return (
                    <div
                      key={check.id}
                      className={`flex rounded-xl rounded-l-[2rem] bg-carbon-900 overflow-hidden ring-1 transition-shadow ${
                        compareIds.includes(check.id) ? "ring-glow-500/60" : "ring-line"
                      }`}
                    >
                      <div className="flex-none w-11 grid place-items-center overflow-hidden border-r border-dashed border-line-strong">
                        <TagHole />
                      </div>
                      <div className="flex-1 min-w-0">
                      <button
                        onClick={() => { setSelected(check); window.scrollTo({ top: 0 }); }}
                        className="w-full text-left p-5 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-ink-faint mb-1.5">
                              {a.vehicle.year}, checked {checkedOn(check.savedAt)}
                            </p>
                            <h3 className="font-display text-xl font-bold text-ink tracking-tight leading-tight truncate">
                              {a.vehicle.make} {a.vehicle.model}
                            </h3>
                            {a.vehicle.price && (
                              <p className="font-mono text-glow-300 text-sm tabular-nums mt-1 [text-shadow:0_0_6px_rgba(169,216,255,0.45)]">{a.vehicle.price}</p>
                            )}
                          </div>
                          <MiniCluster
                            investment={a.investmentScore ?? null}
                            character={computeCharacterScore(a)}
                            cred={a.vibeScore ?? null}
                          />
                        </div>
                        {a.label && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span style={verdictBadgeStyle(a.label)}>{a.label}</span>
                            {a.mode === "roast" && <RoastBadge />}
                          </div>
                        )}
                      </button>
                      <div className="border-t border-line px-5 py-2 flex justify-between items-center">
                        <button
                          onClick={() => toggleCompare(check.id)}
                          className={`font-mono text-xs font-medium uppercase tracking-[0.12em] transition-colors min-h-11 inline-flex items-center px-2 -ml-2 ${
                            compareIds.includes(check.id)
                              ? "text-glow-400"
                              : "text-ink-faint hover:text-ink-muted"
                          }`}
                        >
                          {compareIds.includes(check.id) ? "✓ Comparing" : "+ Compare"}
                        </button>
                        <button
                          onClick={() => handleDelete(check.id)}
                          className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-faint hover:text-red-400 transition-colors min-h-11 inline-flex items-center px-2 -mr-2"
                        >
                          Remove
                        </button>
                      </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-center items-center gap-2 pt-2">
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-faint hover:text-ink-muted transition-colors min-h-11 inline-flex items-center px-4"
                  >
                    Import Check
                  </button>
                  <div className="h-3 w-px bg-line-strong" />
                  <button
                    onClick={handleClearAll}
                    className={`font-mono text-xs font-medium uppercase tracking-[0.12em] transition-colors min-h-11 inline-flex items-center px-4 ${
                      confirmClear ? "text-red-400" : "text-ink-faint hover:text-ink-muted"
                    }`}
                  >
                    {confirmClear ? "Tap again to clear the lot" : "Clear Garage"}
                  </button>
                </div>
              </div>
            )}

            {importError && (
              <p className="font-mono text-xs text-center leading-relaxed" style={{ color: "#ff9d8a" }}>
                {importError}
              </p>
            )}

            {/* Hidden import input — shared by empty state and list controls */}
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />

            <p className="font-mono text-ink-faint text-xs leading-relaxed text-center pt-4">
              Checks live in this browser&apos;s storage only — clearing your browser data clears the Garage too.
            </p>

            {/* Spacer so the tally bar doesn't cover the footer */}
            {compareIds.length > 0 && <div className="h-20" />}
          </>
        )}
      </main>

      {/* Undo bar for Remove — sits above the compare bar when both show */}
      {removed && !comparing && !selected && (
        <div
          role="status"
          className={`fixed inset-x-0 z-40 px-5 ${compareIds.length > 0 ? "bottom-20" : "bottom-4"}`}
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 rounded-lg bg-carbon-850 ring-1 ring-line-strong px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <p className="text-sm text-ink-muted min-w-0 truncate">
              Removed {removed.check.analysis.vehicle.make} {removed.check.analysis.vehicle.model}
            </p>
            <button
              onClick={handleUndo}
              className="flex-shrink-0 font-display text-sm font-bold uppercase tracking-[0.08em] text-glow-400 hover:text-glow-300 min-h-11 px-2"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Tally Up bar — appears once a check is picked */}
      {!comparing && !selected && compareIds.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-carbon-950/90 backdrop-blur-md px-5 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-ink-muted uppercase tracking-[0.12em] leading-relaxed min-w-0 truncate">
              {comparePair.length === 2
                ? `${comparePair[0].analysis.vehicle.model} vs ${comparePair[1].analysis.vehicle.model}`
                : "Pick one more to compare"}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setCompareIds([])}
                aria-label="Clear picks"
                className="font-mono text-xs uppercase tracking-[0.12em] text-ink-faint hover:text-ink-muted transition-colors min-h-11 inline-flex items-center px-2"
              >
                Clear
              </button>
              <button
                onClick={() => setComparing(true)}
                disabled={comparePair.length < 2}
                className="bg-glow-500 hover:bg-glow-400 active:bg-glow-600 disabled:bg-carbon-800 disabled:text-ink-faint disabled:cursor-not-allowed text-carbon-950 font-mono font-bold uppercase tracking-[0.12em] rounded-lg min-h-11 inline-flex items-center px-5 transition-all text-xs"
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
