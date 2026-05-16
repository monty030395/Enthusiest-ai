const fs = require('fs');
const path = require('path');

const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const version = sha ? sha.slice(0, 8) : Date.now().toString(36);

const swPath = path.join(__dirname, '../public/sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${version}';`);
fs.writeFileSync(swPath, sw);
console.log(`[sw] Cache version: ${version}`);
