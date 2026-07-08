// Bumps APP_VERSION in index.html by 1. Invoked by .githooks/pre-commit
// whenever index.html is part of the commit, so the header's version
// badge always reflects the latest pushed code. Uses plain string
// replacement (not line-based tools like sed) so the file's CRLF line
// endings are left untouched.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
const content = fs.readFileSync(file, 'utf8');
const match = content.match(/const APP_VERSION = (\d+);/);

if (!match) {
  console.error('bump-version: APP_VERSION not found — skipping bump');
  process.exit(0);
}

const next = Number(match[1]) + 1;
const updated = content.replace(/const APP_VERSION = \d+;/, `const APP_VERSION = ${next};`);
fs.writeFileSync(file, updated, 'utf8');
console.log(`bump-version: APP_VERSION ${match[1]} -> ${next}`);
