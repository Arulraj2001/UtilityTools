// This script runs before the ESM module graph is loaded
// It reads server/conversion/.env and sets process.env BEFORE config.js evaluates
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.parsed) {
    console.error('[env] Loaded', Object.keys(result.parsed).length, 'vars from', path.relative(process.cwd(), envPath));
  }
} else {
  console.error('[env] No .env found at', envPath);
}