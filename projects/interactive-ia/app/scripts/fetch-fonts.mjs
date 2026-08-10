import fs from 'node:fs';
import https from 'node:https';
import { execFileSync } from 'node:child_process';

execFileSync('curl.exe', [
  '-sL',
  '-H', 'Accept: text/css,*/*;q=0.1',
  '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  '-o', 'assets/fonts/_gf.css',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
], { stdio: 'inherit' });

const css = fs.readFileSync('assets/fonts/_gf.css', 'utf8');
const wanted = [];

for (const m of css.matchAll(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{([^}]+)\}/g)) {
  const body = m[1];
  const family = body.match(/font-family:\s*'([^']+)'/)?.[1];
  const weight = body.match(/font-weight:\s*(\d+)/)?.[1];
  const url = body.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/)?.[1];
  if (!family || !weight || !url) continue;
  const file = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}.woff2`;
  wanted.push({ family, weight, url, file });
}

console.log('faces:', wanted.map((w) => `${w.file} ← ${w.url.split('/').pop()}`).join('\n'));

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const go = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          go(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const f = fs.createWriteStream(dest);
        res.pipe(f);
        f.on('finish', () => f.close(resolve));
      }).on('error', reject);
    };
    go(url);
  });
}

const cssOut = [];
for (const w of wanted) {
  await download(w.url, `assets/fonts/${w.file}`);
  cssOut.push(`@font-face {
  font-family: '${w.family}';
  font-style: normal;
  font-weight: ${w.weight};
  font-display: swap;
  src: url('../fonts/${w.file}') format('woff2');
}`);
}

fs.writeFileSync('assets/fonts/fonts.css', cssOut.join('\n\n') + '\n');
fs.writeFileSync(
  'assets/fonts/SOURCES.txt',
  'Self-hosted latin subsets from Google Fonts (SIL Open Font License).\n\n' +
    wanted.map((w) => `${w.file}\n  ${w.url}`).join('\n') + '\n'
);
fs.unlinkSync('assets/fonts/_gf.css');
console.log('done', wanted.length);
