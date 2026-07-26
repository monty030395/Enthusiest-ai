// The Garage: completed checks saved to localStorage, device-only.
// Nothing here ever leaves the browser — keep it that way, the privacy
// policy promises it.
import type { Analysis } from "./analysis";

export type SavedCheck = {
  id: string;
  savedAt: number; // epoch ms
  listingUrl?: string;
  analysis: Analysis;
};

const KEY = "motormind.garage.v1";
// ~5-8 KB per check; 50 stays far clear of the 5 MB localStorage quota
const MAX_CHECKS = 50;

export function loadGarage(): SavedCheck[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(checks: SavedCheck[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(checks));
  } catch {
    // quota exceeded / private browsing — saving is best-effort
  }
}

export function saveCheck(analysis: Analysis): SavedCheck | null {
  if (typeof window === "undefined") return null;
  const check: SavedCheck = {
    id: newId(),
    savedAt: Date.now(),
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

export function clearGarage() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
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
