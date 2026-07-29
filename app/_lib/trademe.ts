// Turns an AI-suggested alternative into a Trade Me search the user can
// actually act on. Keyword search rather than a make/model path — a rigid
// path 404s or empties out when the suggestion is a rare spec, whereas a
// keyword search degrades to "here's what's close".
const SEARCH_BASE = "https://www.trademe.co.nz/a/motors/cars/search";
const PRICE_BAND = 5000;

export function trademeSearchUrl(name: string, priceRange?: string): string {
  const params = new URLSearchParams({ search_string: name.trim() });

  // priceRange comes through as prose: "$8,000–$14,000", "$12,000 - $18,000".
  // Only filter when we get a clean pair — a single figure is ambiguous
  // (is "$12,000+" a floor or a ceiling?) and a wrong filter hides listings.
  const figures = (priceRange ?? "")
    .match(/\d[\d,]*/g)
    ?.map((n) => parseInt(n.replace(/,/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n > 0) ?? [];

  if (figures.length >= 2) {
    // Trade Me snaps price filters to 5k bands and silently discards values
    // that don't land on one — $8,000–$12,000 came back as "Price: Any".
    // Widen outwards to the enclosing band so the filter applies; erring wide
    // shows a few extra cars, erring narrow hides the ones they wanted.
    const min = Math.floor(Math.min(...figures) / PRICE_BAND) * PRICE_BAND;
    const max = Math.ceil(Math.max(...figures) / PRICE_BAND) * PRICE_BAND;
    if (min > 0) params.set("price_min", String(min));
    params.set("price_max", String(max));
  }

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
