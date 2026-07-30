// Hand-off between the share target and the analyser. sessionStorage rather
// than a query string so a long shared blob doesn't end up in the URL bar,
// and so it dies with the tab rather than lingering.
const KEY = "motormind.sharedListing";

export type SharedListing = {
  listingUrl?: string;
  text?: string;
  title?: string;
};

// Trade Me's native "Share" button never sends the seller's description —
// only a canned forwarding sentence, the title (repeated in both the title
// and text fields), and the link. A naive length check treats that whole
// blob as real listing content, because the sentence plus a long title plus
// a long URL easily clears any reasonable character threshold — verified
// against a real share: "I saw this listing you may be interested in:
// 2007 Toyota Blade MASTER V6 3.5L https://www.trademe.co.nz/...". That
// produces an analysis with no price, no mileage, nothing the seller
// actually wrote — just the model's general knowledge of the model,
// silently dressed up as a listing read.
//
// So: strip the URL, strip the title if it's echoed in the text, strip
// known forwarding boilerplate, and judge only what survives. Real seller
// prose is what's left over; a forwarded title-plus-link is not.
const BOILERPLATE_PATTERNS: RegExp[] = [
  /^i saw this listing you may be interested in:?/i,
  /^check out this listing:?/i,
  /^have a look at this:?/i,
  /^thought you.d (be interested|like this):?/i,
];

const MIN_REAL_TEXT_LENGTH = 80;

export function extractRealListingText(
  text: string | undefined,
  title: string | undefined,
  url: string | undefined
): string | undefined {
  if (!text) return undefined;
  let cleaned = text;

  if (url) cleaned = cleaned.split(url).join(" ");
  cleaned = cleaned.replace(/https?:\/\/\S+/g, " ");

  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  if (title?.trim()) cleaned = cleaned.split(title.trim()).join(" ");

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned.length > MIN_REAL_TEXT_LENGTH ? cleaned : undefined;
}

export function stashSharedListing(value: SharedListing) {
  if (typeof window === "undefined") return;
  if (!value.listingUrl && !value.text && !value.title) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // private browsing — the share just won't carry over
  }
}

// Read-once: the analyser consumes it on mount so a refresh doesn't
// resurrect a listing the user has moved on from.
export function takeSharedListing(): SharedListing | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
