// Facebook Marketplace links, as they arrive from the share sheet or a
// paste. /api/listing fetches the listing behind one (see facebookListing.ts);
// these helpers only recognise and parse links, so they're safe on the
// client. Covers the long /marketplace/item/<id> link, the app's
// /share/<code> links, and the fb.me / m.facebook.com shorteners.
const FACEBOOK_URL = /https?:\/\/(?:[a-z0-9-]+\.)?(?:facebook\.com|fb\.com|fb\.me)\/[^\s]*/i;

export function extractFacebookUrl(...parts: (string | undefined)[]): string | undefined {
  for (const part of parts) {
    const match = part?.match(FACEBOOK_URL);
    if (match) return match[0];
  }
  return undefined;
}

export function isFacebookHost(hostname: string): boolean {
  return /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i.test(hostname);
}

// The numeric listing id from a /marketplace/item/<id> link. Undefined for
// share links, searches and anything off Facebook.
export function facebookItemId(value: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return undefined;
  }
  if (!isFacebookHost(parsed.hostname)) return undefined;
  return parsed.pathname.match(/\/marketplace\/item\/(\d+)/i)?.[1];
}

export const FACEBOOK_HINT =
  "Got the link, but couldn't pull the listing from Facebook. In the listing, tap \"See more\" under the description, press and hold the text, select it all and copy it, then paste it here. Or switch to Screenshots and upload a few. The link stays attached to your check.";
