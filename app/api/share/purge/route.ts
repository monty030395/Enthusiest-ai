import { NextRequest, NextResponse } from "next/server";
import { SHARE_TTL_DAYS } from "../../../_lib/shared";
import { purgeExpired, shareStoreConfigured } from "../../../_lib/shareStore";

// Daily Vercel cron (see vercel.json). Deletes shared links past the TTL the
// privacy policy promises — without this the promise would be a lie.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!shareStoreConfigured()) {
    return NextResponse.json({ error: "No blob store configured." }, { status: 503 });
  }
  try {
    const removed = await purgeExpired(SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);
    return NextResponse.json({ removed });
  } catch (err) {
    console.error("Share purge error:", err);
    return NextResponse.json({ error: "Purge failed." }, { status: 500 });
  }
}
