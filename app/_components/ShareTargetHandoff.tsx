"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { extractTradeMeUrl } from "../_lib/trademe";
import { stashSharedListing, extractRealListingText } from "../_lib/sharedListing";
import Masthead from "./Masthead";
import { Card, WheelSpinner } from "./ui";

// Android hands the share over as a GET, so this can't be a POST handler —
// it stashes what arrived in sessionStorage and redirects, which also keeps
// the shared text out of the URL bar on the analyser page.
export default function ShareTargetHandoff({
  title,
  text,
  url,
}: {
  title?: string;
  text?: string;
  url?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    stashSharedListing({
      listingUrl: extractTradeMeUrl(url, text, title),
      // Trade Me's share never contains the seller's description — see
      // extractRealListingText for why a plain length check gets this wrong
      text: extractRealListingText(text, title, url),
      title: title?.trim() || undefined,
    });
    router.replace("/");
  }, [title, text, url, router]);

  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">
      <Masthead />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <Card className="p-12 flex flex-col items-center gap-5">
          <WheelSpinner />
          <p className="font-display text-ink font-bold text-sm uppercase tracking-[0.12em]">
            Catching that listing
          </p>
        </Card>
      </main>
    </div>
  );
}
