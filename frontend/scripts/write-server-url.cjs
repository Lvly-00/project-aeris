// Writes the baked-in server URL for the desktop thin client.
// Used by `npm run build:desktop` so installs always point at the right
// server without the user editing any files. Override with AERIS_SERVER_URL.
const fs = require('fs');
const path = require('path');

const url =
  process.env.AERIS_SERVER_URL || 'https://project-aeris-pearl.vercel.app';

const target = path.join(__dirname, '..', 'electron', 'server-url.json');
fs.writeFileSync(target, JSON.stringify({ url }, null, 2) + '\n');
console.log(`[build] baked server URL: ${url}`);