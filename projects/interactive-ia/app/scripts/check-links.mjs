import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'scripts') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const htmlFiles = walk(ROOT);
let links = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|data:|#)/.test(href)) continue;
    if (href.startsWith('//')) continue;
    links++;
    const [rel, hash] = href.split('#');
    const target = path.resolve(path.dirname(file), rel);
    if (!fs.existsSync(target)) {
      problems.push(`BROKEN ${path.relative(ROOT, file)} → ${href}`);
      continue;
    }
    if (hash) {
      const t = fs.readFileSync(target, 'utf8');
      if (!t.includes(`id="${hash}"`)) {
        problems.push(`ANCHOR ${path.relative(ROOT, file)} → ${href}`);
      }
    }
  }
}

console.log(`Checked ${links} local href/src refs across ${htmlFiles.length} HTML files.`);
if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('OK — all local links and anchors resolve.');
