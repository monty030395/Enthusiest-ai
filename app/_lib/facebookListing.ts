// Server-side only — fetches one Facebook Marketplace listing through the
// Apify actor. Called from /api/listing, so the WAF rate-limit rule on that
// path covers it. Spike results and the reasoning behind each choice here
// are in ROADMAP.md.
import { facebookItemId, isFacebookHost } from "./facebook";

const DEFAULT_ACTOR = "apify~facebook-marketplace-scraper";
const RESOLVE_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

type ListingRecord = Record<string, unknown>;

// The Facebook app shares /share/<code> links, and the actor returns an
// empty item for those. A plain request gets a 302 to the real
// /marketplace/item/<id> link. Deliberately Node's default user agent:
// a browser one gets a 400, and a Facebook-crawler one would be
// impersonating Facebook. Every hop must stay on Facebook, so this can't be
// used to make the server fetch anything else.
export async function resolveFacebookItemId(url: string): Promise<string | undefined> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const id = facebookItemId(current);
    if (id) return id;

    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return undefined;
    }
    if (parsed.protocol !== "https:" || !isFacebookHost(parsed.hostname)) return undefined;

    const res = await fetch(parsed, {
      redirect: "manual",
      signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return undefined;
    current = new URL(location, parsed).toString();
  }
  return undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "text" in value) return text((value as { text: unknown }).text);
  return undefined;
}

// Sellers often list at $1 to mean "make an offer" — passing that on would
// have the analysis calling a $9k car a steal
function price(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { amount, currency } = value as { amount?: unknown; currency?: unknown };
  const n = typeof amount === "string" ? Number(amount) : typeof amount === "number" ? amount : NaN;
  if (!Number.isFinite(n) || n <= 1) return undefined;
  const formatted = `$${n.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
  return currency && currency !== "NZD" ? `${formatted} ${currency}` : formatted;
}

function status(record: ListingRecord): string | undefined {
  if (record.isSold === true) return "sold";
  if (record.isPending === true) return "sale pending";
  return undefined;
}

function listed(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

// Facebook has no structured odometer/year/make fields for these — the spike
// found only "Condition" — so the seller's own title and description carry
// all of that, the same text a user would otherwise have copied in.
function listingToText(record: ListingRecord): string | undefined {
  const description = text(record.description);
  if (!description) return undefined;

  const facts: [string, string | undefined][] = [
    ["Price", price(record.listingPrice)],
    ["Status", status(record)],
    ["Condition", text(record.condition)],
    ["Location", text(record.locationText)],
    ["Listed", listed(record.timestamp)],
    ["Source", "Facebook Marketplace"],
  ];
  const lines = [
    text(record.listingTitle),
    ...facts.filter(([, v]) => v).map(([label, v]) => `${label}: ${v}`),
    "",
    description,
  ].filter((line): line is string => line !== undefined);
  return lines.join("\n").trim();
}

export type FacebookFetchResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string };

export async function fetchFacebookListing(
  url: string,
  token: string,
  timeoutSecs: number
): Promise<FacebookFetchResult> {
  let id: string | undefined;
  try {
    id = await resolveFacebookItemId(url);
  } catch (err) {
    console.error("Facebook share link didn't resolve:", err);
  }
  if (!id) {
    return { ok: false, status: 400, error: "That doesn't look like a Facebook Marketplace listing link." };
  }

  const actor = process.env.APIFY_FACEBOOK_ACTOR || DEFAULT_ACTOR;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=${timeoutSecs}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          // Only ever a canonical item URL built from the id, never what the
          // user sent, so this can't be pointed at searches
          startUrls: [{ url: `https://www.facebook.com/marketplace/item/${id}/` }],
          resultsLimit: 1,
          // The description only comes with details on — and it's the part
          // the analysis actually reads
          includeListingDetails: true,
        }),
      }
    );
    if (!res.ok) {
      console.error("Apify Facebook fetch failed:", res.status, await res.text().catch(() => ""));
      return { ok: false, status: 502, error: "Couldn't pull that listing from Facebook." };
    }

    const items: unknown = await res.json();
    const record = Array.isArray(items) ? (items[0] as ListingRecord | undefined) : undefined;
    const listingText = record && typeof record === "object" ? listingToText(record) : undefined;
    if (!listingText) {
      console.error("Apify Facebook fetch returned no description for listing", id);
      return { ok: false, status: 502, error: "Couldn't find a description on that listing." };
    }
    return { ok: true, text: listingText };
  } catch (err) {
    console.error("Apify Facebook fetch error:", err);
    return { ok: false, status: 502, error: "Couldn't pull that listing from Facebook." };
  }
}
