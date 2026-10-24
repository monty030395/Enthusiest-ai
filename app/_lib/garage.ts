// The Garage: completed checks saved to localStorage, device-only.
// Nothing here ever leaves the browser — keep it that way, the privacy
// policy promises it.
import { useMemo, useSyncExternalStore } from "react";
import type { Analysis } from "./analysis";

export type SavedCheck = {
  id: string;
  savedAt: number; // epoch ms
  listingUrl?: string;
  analysis: Analysis;
};

const KEY = "motormind.garage.v1";
// Fired after every write so useGarage() re-reads without anyone having to
// hand the new list back to it
const CHANGE_EVENT = "motormind:garage";
// ~5-8 KB per check; 50 stays far clear of the 5 MB localStorage quota
const MAX_CHECKS = 50;

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseGarage(raw: string): SavedCheck[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadGarage(): SavedCheck[] {
  if (typeof window === "undefined") return [];
  return parseGarage(readRaw());
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function persist(checks: SavedCheck[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(checks));
  } catch {
    // quota exceeded / private browsing — saving is best-effort
  }
  notify();
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// The saved checks, live. Null during SSR and the first client render, so
// those agree (localStorage is browser-only); the raw string is the
// snapshot because it's stable between reads where a parsed array isn't.
export function useGarage(): SavedCheck[] | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => (raw === null ? null : parseGarage(raw)), [raw]);
}

export function saveCheck(analysis: Analysis, listingUrl?: string): SavedCheck | null {
  if (typeof window === "undefined") return null;
  const check: SavedCheck = {
    id: newId(),
    savedAt: Date.now(),
    listingUrl,
    analysis,
  };
  persist([check, ...loadGarage()].slice(0, MAX_CHECKS));
  return check;
}

export function deleteCheck(id: string): SavedCheck[] {
  const remaining = loadGarage().filter((c) => c.id !== id);
  persist(remaining);
  return remaining;
}

// Undo for a delete: puts the check back where it was, unless it's already
// there (a double-tapped Undo)
export function restoreCheck(check: SavedCheck, index: number) {
  const checks = loadGarage();
  if (checks.some((c) => c.id === check.id)) return;
  checks.splice(Math.min(index, checks.length), 0, check);
  persist(checks.slice(0, MAX_CHECKS));
}

export function clearGarage() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  notify();
}

// ── Export / import — swap checks between devices or mates ──

const EXPORT_FORMAT = "motormind-check";

export function exportCheck(check: SavedCheck): { filename: string; json: string } {
  const v = check.analysis.vehicle;
  const slug = `${v.make}-${v.model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    filename: `motormind-check-${slug || "unknown"}.json`,
    json: JSON.stringify(
      { format: EXPORT_FORMAT, version: 1, exportedAt: Date.now(), savedAt: check.savedAt, listingUrl: check.listingUrl, analysis: check.analysis },
      null,
      2
    ),
  };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Liberal on input: accepts our export envelope, a raw SavedCheck, or a bare
// Analysis — anything with a plausible vehicle inside. Returns the updated
// garage, or null if the file isn't a Motormind check.
export function importCheck(raw: string): SavedCheck[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const analysis = (obj.analysis ?? obj) as Analysis;
  if (
    typeof analysis !== "object" || analysis === null ||
    typeof analysis.vehicle !== "object" || analysis.vehicle === null ||
    typeof analysis.vehicle.make !== "string" || typeof analysis.vehicle.model !== "string"
  ) {
    return null;
  }
  const check: SavedCheck = {
    id: newId(),
    savedAt: typeof obj.savedAt === "number" ? obj.savedAt : Date.now(),
    listingUrl: typeof obj.listingUrl === "string" ? obj.listingUrl : undefined,
    analysis,
  };
  const garage = [check, ...loadGarage()].slice(0, MAX_CHECKS);
  persist(garage);
  return garage;
}
