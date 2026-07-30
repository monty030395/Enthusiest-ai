// Rebuilds mockup.html from mockup-template.html by inlining the three font
// files in ./fonts/ as base64 @font-face data URIs. Run after editing the
// template: `node build.js` from this directory.
//
// The fonts here are the project's real Syne / JetBrains Mono / Inter
// latin-subset files (copied out of .next/static/media at the time this
// concept was built) — not an approximation. If they ever need refreshing,
// pull the current latin-subset .woff2 files for each family out of
// .next/static/media (match by grepping the [next]_internal_font_google_*
// chunk CSS in .next/dev/static/chunks for the src url with the
// U+0000-00FF-ish unicode-range) and drop them in here under the same names.

const fs = require("fs");
const path = require("path");

const dir = __dirname;
let html = fs.readFileSync(path.join(dir, "mockup-template.html"), "utf8");

const syne = fs.readFileSync(path.join(dir, "fonts/syne.woff2")).toString("base64");
const jbmono = fs.readFileSync(path.join(dir, "fonts/jetbrains-mono.woff2")).toString("base64");
const inter = fs.readFileSync(path.join(dir, "fonts/inter.woff2")).toString("base64");

html = html
  .replace("__SYNE_B64__", syne)
  .replace("__JBMONO_B64__", jbmono)
  .replace("__INTER_B64__", inter);

fs.writeFileSync(path.join(dir, "mockup.html"), html);
console.log(`Wrote mockup.html (${html.length} bytes)`);
