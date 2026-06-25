const fs = require('fs');
const path = require('path');

const pendingPath = path.join(__dirname, '..', 'data', 'pending_feedback.json');
const backupPath = path.join(__dirname, '..', 'data', `pending_feedback.json.bak.${Date.now()}`);

if (!fs.existsSync(pendingPath)) {
  console.error('No pending_feedback.json found');
  process.exit(1);
}

const raw = fs.readFileSync(pendingPath, 'utf8');
fs.copyFileSync(pendingPath, backupPath);
console.log('Backup written to', backupPath);

// Find all JSON object substrings like {"text": ... "label": ...}
const objRegex = /\{\s*"text"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*"label"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g;
const matches = raw.match(objRegex) || [];
console.log('Found', matches.length, 'valid objects in pending file');

const objs = matches.map(s => {
  try { return JSON.parse(s); } catch (e) { return null; }
}).filter(Boolean);

fs.writeFileSync(pendingPath, JSON.stringify(objs, null, 2), 'utf8');
console.log('Repaired pending_feedback.json with', objs.length, 'entries');
process.exit(0);
