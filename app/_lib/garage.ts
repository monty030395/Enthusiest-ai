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
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
