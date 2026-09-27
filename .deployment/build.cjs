const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inside(base, relative) {
  const result = path.resolve(base, relative);
  if (!result.startsWith(base + path.sep)) throw new Error('Invalid manifest path');
  return result;
}
if (fs.existsSync(output)) throw new Error('_site already exists; use a clean checkout');
for (const entry of manifest.files) {
  const bytes = entry.parts ? Buffer.concat(entry.parts.map(part => {
    const data = fs.readFileSync(inside(root, part.path));
    if (hash(data) !== part.sha256) throw new Error('Part hash mismatch: ' + part.path);
    return data;
  })) : fs.readFileSync(inside(root, entry.path));
  if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) {
    throw new Error('Original file mismatch: ' + entry.path);
  }
  const target = inside(output, entry.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  if (hash(fs.readFileSync(target)) !== entry.sha256) throw new Error('Write verification failed');
}
console.log('Verified and restored ' + manifest.files.length + ' unchanged website files.');
