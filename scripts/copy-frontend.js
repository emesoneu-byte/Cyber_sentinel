const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'frontend', 'dist');
const dest = path.join(__dirname, '..', 'backend', 'dist', 'public');
if (!fs.existsSync(src)) {
  console.error('frontend/dist missing');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Copied frontend/dist -> backend/dist/public');
