// Server-side only — imports the Blob SDK and reads BLOB_READ_WRITE_TOKEN.
// Never import this from a "use client" module.
import { put, get, list, del } from "@vercel/blob";
import { parseSharedPayload, type SharedPayload } from "./shared";

const PREFIX = "c/";

// No ambiguous characters — these ids get read aloud and typed by hand
const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function newShareId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return id;
}

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Without a Blob store, fall back to the OS temp dir so `npm run dev` works
// on a laptop with no Vercel storage wired up. Never used in production —
// serverless filesystems don't persist between invocations.
const useLocalFallback = () => !hasBlob() && process.env.NODE_ENV !== "production";

async function localDir() {
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { mkdir } = await import("node:fs/promises");
  const dir = join(tmpdir(), "motormind-shares");
  await mkdir(dir, { recursive: true });
  return { dir, join };
}

export function shareStoreConfigured(): boolean {
  return hasBlob() || useLocalFallback();
}

export async function putShared(payload: SharedPayload): Promise<string> {
  const id = newShareId();
  const body = JSON.stringify(payload);

  if (useLocalFallback()) {
    const { writeFile } = await import("node:fs/promises");
    const { dir, join } = await localDir();
    await writeFile(join(dir, `${id}.json`), body, "utf8");
    return id;
  }

  // Private: only this server can read the raw JSON. The /c/<id> page is
  // server-rendered, so sharing a link never means exposing the blob itself.
  await put(`${PREFIX}${id}.json`, body, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  return id;
}

export async function getShared(id: string): Promise<SharedPayload | null> {
  // Ids come straight off the URL — never let one walk the store
  if (!/^[a-z0-9]{6,24}$/.test(id)) return null;

  if (useLocalFallback()) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { dir, join } = await localDir();
      return parseSharedPayload(JSON.parse(await readFile(join(dir, `${id}.json`), "utf8")));
    } catch {
      return null;
    }
  }

  try {
    const result = await get(`${PREFIX}${id}.json`, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return parseSharedPayload(await new Response(result.stream).json());
  } catch {
    return null;
  }
}

// Cron-driven cleanup so the "links expire" promise in the privacy policy
// is actually true
export async function purgeExpired(olderThanMs: number): Promise<number> {
  if (!hasBlob()) return 0;
  const cutoff = Date.now() - olderThanMs;
  let cursor: string | undefined;
  let removed = 0;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    const stale = page.blobs.filter((b) => new Date(b.uploadedAt).getTime() < cutoff);
    if (stale.length > 0) {
      await del(stale.map((b) => b.url));
      removed += stale.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return removed;
}
