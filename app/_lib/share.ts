// Web Share sheet on phones, clipboard everywhere else.
// Returns what actually happened so callers can show the right note.
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export async function shareOrCopy(text: string): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      // User dismissed the sheet — not a failure, don't fall through to clipboard
      if ((err as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
