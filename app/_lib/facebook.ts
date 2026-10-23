// Facebook Marketplace links can't be fetched the way Trade Me's are (see
// ROADMAP.md), so all we do with one is recognise it — keep it as the
// check's listing link and tell the user to copy the description instead.
// Covers the long /marketplace/item/<id> link, the app's /share/<code>
// links, and the fb.me / m.facebook.com shorteners.
const FACEBOOK_URL = /https?:\/\/(?:[a-z0-9-]+\.)?(?:facebook\.com|fb\.com|fb\.me)\/[^\s]*/i;

export function extractFacebookUrl(...parts: (string | undefined)[]): string | undefined {
  for (const part of parts) {
    const match = part?.match(FACEBOOK_URL);
    if (match) return match[0];
  }
  return undefined;
}

export const FACEBOOK_HINT =
  "Facebook won't let us open Marketplace listings, so we need the words. In the listing, tap \"See more\" under the description, press and hold the text, select it all and copy it, then paste it here. Or switch to Screenshots and upload a few. The link stays attached to your check.";
