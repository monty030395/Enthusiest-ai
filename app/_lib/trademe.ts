// Turns an AI-suggested alternative into a Trade Me search the user can
// actually act on. Keyword search rather than a make/model path — a rigid
// path 404s or empties out when the suggestion is a rare spec, whereas a
// keyword search degrades to "here's what's close".
const SEARCH_BASE = "https://www.trademe.co.nz/a/motors/cars/search";

// Deliberately no price filter. The suggested price range is the model's
// estimate, and estimates are sometimes badly wrong — it put NZ S2000s at
// $20-30k when Trade Me's own median listing is $51k, so filtering by it
// returned nothing at all. Trade Me knows what cars cost and we don't, so
// the search shows the real market and the estimate on the card can be
// judged against it. A user seeing "we guessed $25k, they're actually $45k"
// has learned something; a user seeing an empty page thinks we're broken.
export function trademeSearchUrl(name: string): string {
  const params = new URLSearchParams({ search_string: name.trim() });
  return `${SEARCH_BASE}?${params.toString()}`;
}

export function isTradeMeUrl(value: string): boolean {
  return /(^|\/\/|\.)trademe\.co\.nz/i.test(value);
}

// Pulls the first Trade Me link out of shared text — the Android share sheet
// often hands over "Title — https://www.trademe.co.nz/..." as one blob.
export function extractTradeMeUrl(...parts: (string | undefined)[]): string | undefined {
  for (const part of parts) {
    const match = part?.match(/https?:\/\/[^\s]*trademe\.co\.nz[^\s]*/i);
    if (match) return match[0];
  }
  return undefined;
}
