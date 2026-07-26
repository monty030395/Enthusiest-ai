import type { ShareInput } from "./shared";

// Web Share sheet on phones, clipboard everywhere else.
// Returns what actually happened so callers can show the right note.
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export async function shareOrCopy(text: string, url?: string): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(url ? { text, url } : { text });
      return "shared";
    } catch (err) {
      // User dismissed the sheet — not a failure, don't fall through to clipboard
      if ((err as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    return "copied";
  } catch {
    return "failed";
  }
}

// Uploads the check/tally and returns a public link to it. Null means the
// deployment has no blob store wired up — callers fall back to text-only.
export async function createShareLink(payload: ShareInput): Promise<string | null> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id ? `${window.location.origin}/c/${data.id}` : null;
  } catch {
    return null;
  }
}
