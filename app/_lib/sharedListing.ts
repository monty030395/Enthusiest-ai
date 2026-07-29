// Hand-off between the share target and the analyser. sessionStorage rather
// than a query string so a long shared blob doesn't end up in the URL bar,
// and so it dies with the tab rather than lingering.
const KEY = "motormind.sharedListing";

export type SharedListing = {
  listingUrl?: string;
  text?: string;
  title?: string;
};

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
