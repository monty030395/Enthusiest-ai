import { NextRequest, NextResponse } from "next/server";
import { tradeMeListingId } from "../../_lib/trademe";

// The Trade Me Android app won't let you copy a listing's description, so
// without this the share sheet hands us a bare link and the user is left
// screenshotting the listing four or five times. This fetches that one
// listing through an Apify actor instead. Trade Me's own API is closed to
// buyer-side tools (in-trade sellers only since April 2026), and Trade Me
// blocks plain server fetches — see ROADMAP.md before widening this beyond
// a single listing the user explicitly shared.
//
// Apify's sync endpoint waits for the actor run to finish; 50s leaves room
// inside maxDuration for the response to make it back.
export const maxDuration = 60;
const APIFY_TIMEOUT_SECS = 50;
const DEFAULT_ACTOR = "blackfalcondata~trademe-scraper";

type ListingRecord = Record<string, unknown>;

// The actor's field names come from its store page, not a contract — read
// defensively and only fail if there's no description at all.
function pickString(record: ListingRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function nzd(record: ListingRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "number" && value > 0 ? `$${value.toLocaleString("en-NZ")}` : undefined;
}

// An auction's priceText is the current bid, not what the seller wants, so
// the analysis needs the listing type, reserve and Buy Now alongside it
function listingType(record: ListingRecord): string | undefined {
  const type = pickString(record, "listingType");
  const reserve = pickString(record, "reserveState");
  if (!type) return undefined;
  return reserve && type === "auction" ? `auction (reserve ${reserve})` : type;
}

function listingToText(record: ListingRecord): string | undefined {
  const description = pickString(record, "descriptionText", "description", "descriptionMarkdown");
  if (!description) return undefined;

  const facts: [string, string | undefined][] = [
    ["Price", pickString(record, "priceText") ?? nzd(record, "priceValue")],
    ["Listing type", listingType(record)],
    ["Buy Now", nzd(record, "buyNowPrice")],
    ["Was", nzd(record, "wasPrice")],
    ["Year", pickString(record, "year")],
    ["Make", pickString(record, "make")],
    ["Model", pickString(record, "model")],
    ["Odometer", pickString(record, "odometer", "kilometres")],
    ["Engine", pickString(record, "engineSize", "engine")],
    ["Fuel", pickString(record, "fuel", "fuelType")],
    ["Transmission", pickString(record, "transmission")],
    ["Location", pickString(record, "region", "location")],
  ];
  const lines = [
    pickString(record, "title"),
    ...facts.filter(([, v]) => v).map(([label, v]) => `${label}: ${v}`),
    "",
    description,
  ].filter((line): line is string => line !== undefined);
  return lines.join("\n").trim();
}

export async function POST(req: NextRequest) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    // The UI falls back to asking for the description when this happens
    return NextResponse.json(
      { error: "Listing fetch isn't set up on this deployment yet." },
      { status: 503 }
    );
  }

  let url: unknown;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Couldn't read that request." }, { status: 400 });
  }

  // Only ever send the actor a canonical listing URL we built ourselves, so
  // this endpoint can't be pointed at searches or anything off Trade Me
  const id = typeof url === "string" ? tradeMeListingId(url) : undefined;
  if (!id) {
    return NextResponse.json({ error: "That doesn't look like a Trade Me listing link." }, { status: 400 });
  }

  const actor = process.env.APIFY_TRADEME_ACTOR || DEFAULT_ACTOR;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=${APIFY_TIMEOUT_SECS}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          // A stringList in the actor's input schema — plain strings, not
          // the { url } objects most Apify actors take
          startUrls: [`https://www.trademe.co.nz/a/listing/${id}`],
          includeDetails: true,
          descriptionFormat: "all",
          descriptionMaxLength: 0,
          maxResults: 1,
        }),
      }
    );
    if (!res.ok) {
      console.error("Apify listing fetch failed:", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "Couldn't pull that listing from Trade Me." }, { status: 502 });
    }

    const items: unknown = await res.json();
    const record = Array.isArray(items) ? (items[0] as ListingRecord | undefined) : undefined;
    const text = record && typeof record === "object" ? listingToText(record) : undefined;
    if (!text) {
      console.error("Apify listing fetch returned no description for listing", id);
      return NextResponse.json({ error: "Couldn't find a description on that listing." }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Apify listing fetch error:", err);
    return NextResponse.json({ error: "Couldn't pull that listing from Trade Me." }, { status: 502 });
  }
}
