// Writes the baked-in server URLs for the bundled desktop client.
// Used by `npm run build:desktop` so installs always point at the bundled
// ai-service origin (SPA + /ai) and the deployed backend (API + WS), without
// the user editing any files. Override with AERIS_SERVER_URL / AERIS_BACKEND_URL.
// Note: scripts\build-desktop.ps1 is the canonical builder and writes the same
// shape here.
const fs = require('fs');
const path = require('path');

const url =
  process.env.AERIS_SERVER_URL || 'http://localhost:8005';
const backendUrl =
  process.env.AERIS_BACKEND_URL || 'https://project-aeris.onrender.com';

const target = path.join(__dirname, '..', 'electron', 'server-url.json');
fs.writeFileSync(
  target,
  JSON.stringify({ url, backendUrl }, null, 2) + '\n'
);
console.log(`[build] baked app origin: ${url}`);
console.log(`[build] baked backend origin: ${backendUrl}`);