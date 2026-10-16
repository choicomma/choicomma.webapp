const fs = require('fs');
const path = require('path');

const keys = new Set();
const keyUsage = {};

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        scanDir(full);
      }
    } else if (/\.(tsx|ts|js|jsx)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const regex = /localStorage\.(?:getItem|setItem|removeItem)\s*\(\s*["'`]?([^"')`]+)["'`]?/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        let key = match[1].replace(/["'`]/g, '').trim();
        // Skip dynamic key evaluation like `site_live_chat_messages_${id}`
        if (key.includes('$') || key.includes('+')) {
          key = key.split(/[\$\+]/)[0].trim();
        }
        if (key) {
          keys.add(key);
          if (!keyUsage[key]) keyUsage[key] = new Set();
          keyUsage[key].add(path.relative(process.cwd(), full));
        }
      }
    }
  }
}

scanDir('.');

console.log('=== FOUND LOCALSTORAGE KEYS (' + keys.size + ') ===');
const sorted = Array.from(keys).sort();
const result = [];
for (const k of sorted) {
  const files = Array.from(keyUsage[k] || []);
  result.push({ key: k, files });
  console.log(`${k} (${files.length} files) -> ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
}

fs.writeFileSync('scripts/storage-keys-report.json', JSON.stringify(result, null, 2));
