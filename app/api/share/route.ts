import { NextRequest, NextResponse } from "next/server";
import { parseSharedPayload } from "../../_lib/shared";
import { putShared, shareStoreConfigured } from "../../_lib/shareStore";

// A check is ~8 KB and a tally ~16 KB; anything much bigger isn't ours
const MAX_BYTES = 200_000;

export async function POST(req: NextRequest) {
  if (!shareStoreConfigured()) {
    // The UI falls back to a plain text share when this happens
    return NextResponse.json(
      { error: "Link sharing isn't set up on this deployment yet." },
      { status: 503 }
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BYTES) {
    return NextResponse.json({ error: "That's too big to share as a link." }, { status: 413 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Couldn't read that check." }, { status: 400 });
  }

  const payload = parseSharedPayload(parsedBody);
  if (!payload) {
    return NextResponse.json({ error: "That isn't a Motormind check." }, { status: 400 });
  }

  try {
    const id = await putShared(payload);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Share link error:", err);
    return NextResponse.json(
      { error: "Couldn't create the link. Give it another go." },
      { status: 500 }
    );
  }
}
