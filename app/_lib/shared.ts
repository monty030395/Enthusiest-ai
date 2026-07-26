// Shape of a publicly shared check or tally. Kept separate from the Garage
// types because this is the only data that ever leaves the device.
import type { Analysis } from "./analysis";
import type { HeadToHead } from "./compare";

export const SHARE_VERSION = 1;

// Shared links are purged after this many days (see /api/share/purge cron)
export const SHARE_TTL_DAYS = 90;

// What the client sends to /api/share
export type ShareInput =
  | { kind: "check"; analysis: Analysis }
  | { kind: "tally"; a: Analysis; b: Analysis; h2h?: HeadToHead | null };

// What gets stored and read back
export type SharedPayload =
  | { kind: "check"; version: number; sharedAt: number; analysis: Analysis }
  | { kind: "tally"; version: number; sharedAt: number; a: Analysis; b: Analysis; h2h?: HeadToHead | null };

function looksLikeAnalysis(x: unknown): x is Analysis {
  if (typeof x !== "object" || x === null) return false;
  const v = (x as Analysis).vehicle;
  return typeof v === "object" && v !== null && typeof v.make === "string" && typeof v.model === "string";
}

// Used by the API on the way in and the page on the way out — never trust
// blob contents or request bodies without it.
export function parseSharedPayload(raw: unknown): SharedPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  const sharedAt = typeof p.sharedAt === "number" ? p.sharedAt : Date.now();

  if (p.kind === "check" && looksLikeAnalysis(p.analysis)) {
    return { kind: "check", version: SHARE_VERSION, sharedAt, analysis: p.analysis };
  }
  if (p.kind === "tally" && looksLikeAnalysis(p.a) && looksLikeAnalysis(p.b)) {
    const h2h = p.h2h as HeadToHead | undefined;
    const validH2h = h2h && (h2h.winner === "a" || h2h.winner === "b") ? h2h : null;
    return { kind: "tally", version: SHARE_VERSION, sharedAt, a: p.a, b: p.b, h2h: validH2h };
  }
  return null;
}

// Headline used for the page title, share sheet, and OG card
export function sharedTitle(payload: SharedPayload): string {
  const name = (a: Analysis) => [a.vehicle.year, a.vehicle.make, a.vehicle.model].filter(Boolean).join(" ");
  return payload.kind === "check"
    ? name(payload.analysis)
    : `${payload.a.vehicle.make} ${payload.a.vehicle.model} v ${payload.b.vehicle.make} ${payload.b.vehicle.model}`;
}
