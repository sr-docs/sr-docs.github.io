import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CATEGORY_ORDER = [
  'Taxonomy',
  'Content Modeling',
  'Navigation',
  'Content Audit',
  'Search & Findability',
  'Research Synthesis',
  'IA Documentation',
  'No-Code Tools',
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function write(rel, contents) {
  fs.writeFileSync(path.join(ROOT, rel), contents);
}

function chapterDirs() {
  return fs.readdirSync(path.join(ROOT, 'chapters'))
    .filter((d) => /^ch\d+$/.test(d))
    .sort();
}

function chunkFiles(ch) {
  return fs.readdirSync(path.join(ROOT, 'chapters', ch))
    .filter((f) => /^chunk-\d+\.html$/.test(f))
    .sort();
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function loadMeta() {
  const p = path.join(ROOT, 'scripts', 'prompt-meta.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function chapterTitle(ch) {
  const index = read(`chapters/${ch}/index.html`);
  const h1 = (index.match(/<h1 class="chapter-page__title">([^<]+)<\/h1>/) || [, ch])[1].trim();
  return h1;
}

function parseCourse() {
  const meta = loadMeta();
  const lessons = [];
  const prompts = [];
  const promptsByChapter = {};
  const chunkIdsByChapter = {};

  for (const ch of chapterDirs()) {
    const title = chapterTitle(ch);
    promptsByChapter[ch] = 0;
    chunkIdsByChapter[ch] = [];

    for (const file of chunkFiles(ch)) {
      const rel = `chapters/${ch}/${file}`.replace(/\\/g, '/');
      const html = read(rel);
      const chunkNum = file.match(/chunk-(\d+)/)[1];
      const chunkId = `${ch}-chunk-${chunkNum.padStart(2, '0')}`;
      // Prefer explicit data-chunk-id when present (exercise chunks)
      const explicitId = (html.match(/data-chunk-id="([^"]+)"/) || [])[1];
      if (explicitId) chunkIdsByChapter[ch].push(explicitId);
      else if (/ch(0[1-9]|1[0-2])/.test(ch)) {
        // Teaching chapters without exercises still shouldn't appear in progress;
        // only track ids that exist in markup for progress.
      }

      const lessonTitle = (html.match(/class="concept__headline"[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]
        .replace(/\s+/g, ' ').trim();
      const bodyText = stripTags((html.match(/<div class="concept__body">([\s\S]*?)<\/div>/) || [, ''])[1]);
      const snippet = bodyText.slice(0, 140).replace(/\s+\S*$/, '') + (bodyText.length > 140 ? '...' : '');

      lessons.push({
        type: 'Lesson',
        title: decodeEntities(lessonTitle),
        chapter: title,
        snippet: decodeEntities(snippet),
        href: rel,
      });

      const re = /<section class="prompt-fill" id="([^"]+)"([^>]*)>([\s\S]*?)<\/section>/g;
      let m;
      while ((m = re.exec(html))) {
        const id = m[1];
        const body = m[3];
        const fromMeta = meta[id];
        if (!fromMeta) {
          throw new Error(`Missing prompt-meta.json entry for #${id} in ${rel}`);
        }

        let purpose = fromMeta.purpose;
        const simpleP = (body.match(/guidance-body--simple">\s*<p>([^<]*)/) || [, ''])[1].trim();
        const firstLi = (body.match(/guidance-body--simple">[\s\S]*?<li>([^<]+)/) || [, ''])[1].trim();
        if (!purpose) purpose = firstLi || simpleP || fromMeta.title;

        const titleFromLabel = (body.match(/Try It With Your Data:\s*([^<]+)/) || [, ''])[1].trim();
        const promptTitle = fromMeta.title || titleFromLabel || id;

        prompts.push({
          id,
          category: fromMeta.category,
          title: promptTitle,
          purpose,
          href: `${rel}#${id}`,
          chapter: title,
          chapterDir: ch,
        });
        promptsByChapter[ch]++;
      }
    }

    // For ETA, count all chunk files in teaching chapters (ch01–ch12)
    const num = parseInt(ch.replace('ch', ''), 10);
    if (num >= 1 && num <= 12) {
      chunkIdsByChapter[ch] = chunkFiles(ch).map((file) => {
        const n = file.match(/chunk-(\d+)/)[1];
        return `${ch}-chunk-${n.padStart(2, '0')}`;
      });
    }
  }

  return { lessons, prompts, promptsByChapter, chunkIdsByChapter };
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLibrary(prompts) {
  const total = prompts.length;
  const counts = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0]));
  for (const p of prompts) {
    if (!(p.category in counts)) {
      throw new Error(`Unknown category "${p.category}" on prompt ${p.id}`);
    }
    counts[p.category]++;
  }

  // Stable sort: category order, then title
  const sorted = [...prompts].sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.title.localeCompare(b.title);
  });

  const filters = [
    `      <button class="library-filter js-library-filter is-active" data-category="all">All (${total})</button>`,
    ...CATEGORY_ORDER.map((c) => {
      const label = escapeHtml(c);
      const attr = c.replace(/&/g, '&amp;');
      return `      <button class="library-filter js-library-filter" data-category="${attr}">${label} (${counts[c]})</button>`;
    }),
  ].join('\n');

  const items = sorted.map((p) => {
    const search = `${p.title} ${p.purpose} ${p.category}`.toLowerCase();
    return `    <li class="library-item js-library-item" data-category="${escapeHtml(p.category)}" data-search="${escapeHtml(search)}">
      <a href="${escapeHtml(p.href)}" class="library-item__link">
        <span class="library-item__category">${escapeHtml(p.category)}</span>
        <span class="library-item__title">${escapeHtml(p.title)}</span>
        <span class="library-item__purpose">${escapeHtml(p.purpose)}</span>
      </a>
    </li>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Library · IA Course</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<div class="course-wrap course-wrap--wide">

  <a href="index.html" class="chapter-page__back">← Course Home</a>

  <div class="library-header">
    <h1>Prompt Library</h1>
    <p>
      All ${total} AI prompts from the course, in one place. Filter by category or search to find the one you need: each result jumps straight to that prompt, wherever it lives in the course.
    </p>
  </div>

  <div class="library-controls">
    <input type="text" class="library-search js-library-search" placeholder="Search prompts: e.g. &quot;card sort&quot;, &quot;sitemap&quot;, &quot;audit&quot;" aria-label="Search prompts">
    <div class="library-filters" role="group" aria-label="Filter by category">
${filters}
    </div>
  </div>

  <div class="library-count js-library-count">${total} prompts</div>

  <ul class="library-list js-library-list" role="list">
${items}
  </ul>

  <p class="library-empty js-library-empty">No prompts match your search.</p>

</div>

<script src="assets/js/library.js"></script>
</body>
</html>
`;
}

function renderSearchIndex(lessons, prompts) {
  // Prompt "chapter" in the search index is the library category: that is how
  // readers filter conceptually, and it matches the hand-maintained index.
  const entries = [
    ...lessons,
    ...prompts.map((p) => ({
      type: 'Prompt',
      title: p.title,
      chapter: p.category,
      snippet: p.purpose,
      href: p.href,
    })),
  ];

  return `const SEARCH_INDEX = ${JSON.stringify(entries, null, 2)};\n`;
}

function patchHomeCounts(promptsByChapter, chunkIdsByChapter) {
  let home = read('index.html');
  const teachingChapters = Object.keys(chunkIdsByChapter).filter((ch) => {
    const n = parseInt(ch.replace('ch', ''), 10);
    return n >= 1 && n <= 12;
  });
  const totalChunks = teachingChapters.reduce((n, ch) => n + chunkIdsByChapter[ch].length, 0);
  const totalPrompts = Object.values(promptsByChapter).reduce((a, b) => a + b, 0);

  home = home.replace(
    /Browse all \d+ prompts →/,
    `Browse all ${totalPrompts} prompts →`
  );

  home = home.replace(
    /\d+ chunks across 12 chapters\./,
    `${totalChunks} chunks across 12 chapters.`
  );

  // ~8 minutes per exercise chunk: the design target from DESIGN.md
  const MINUTES_PER_CHUNK = 8;

  home = home.replace(
    /(<a href="chapters\/(ch\d+)\/index\.html"[\s\S]*?<\/a>)/g,
    (block, _full, ch) => {
      const ids = chunkIdsByChapter[ch] || [];
      const nPrompts = promptsByChapter[ch] || 0;
      let next = block;

      if (ids.length) {
        next = next.replace(
          /data-chunk-ids="[^"]*"/,
          `data-chunk-ids="${ids.join(',')}"`
        );
      }

      // Time estimate (teaching chapters only; toolkits stay unlabeled)
      next = next.replace(/\s*<div class="chapter-card__time">[\s\S]*?<\/div>/g, '');
      const num = parseInt(ch.replace('ch', ''), 10);
      if (num >= 1 && num <= 12 && ids.length) {
        const mins = ids.length * MINUTES_PER_CHUNK;
        next = next.replace(
          /(<div class="chapter-card__title">[\s\S]*?<\/div>)/,
          `$1\n        <div class="chapter-card__time">~${mins} min</div>`
        );
      }

      next = next.replace(/\s*<div class="chapter-card__prompt-count">[\s\S]*?<\/div>/g, '');
      if (nPrompts > 0) {
        const label = nPrompts === 1 ? '1 AI prompt' : `${nPrompts} AI prompts`;
        next = next.replace(
          /<\/a>$/,
          `        <div class="chapter-card__prompt-count">${label}</div>\n      </a>`
        );
      }
      return next;
    }
  );

  return home;
}

function main() {
  const check = process.argv.includes('--check');
  const { lessons, prompts, promptsByChapter, chunkIdsByChapter } = parseCourse();

  const library = renderLibrary(prompts);
  const searchIndex = renderSearchIndex(lessons, prompts);
  const home = patchHomeCounts(promptsByChapter, chunkIdsByChapter);

  if (check) {
    const diffs = [];
    if (read('library.html') !== library) diffs.push('library.html');
    if (read('assets/js/search-index.js') !== searchIndex) diffs.push('assets/js/search-index.js');
    const currentHome = read('index.html');
    const countRe = /chapter-card__prompt-count">([^<]+)/g;
    const cur = [...currentHome.matchAll(countRe)].map((m) => m[1]);
    const next = [...home.matchAll(countRe)].map((m) => m[1]);
    if (JSON.stringify(cur) !== JSON.stringify(next)) diffs.push('index.html (prompt counts)');
    const timeCur = [...currentHome.matchAll(/chapter-card__time">([^<]+)/g)].map((m) => m[1]);
    const timeNext = [...home.matchAll(/chapter-card__time">([^<]+)/g)].map((m) => m[1]);
    if (JSON.stringify(timeCur) !== JSON.stringify(timeNext)) diffs.push('index.html (time estimates)');
    const idsCur = [...currentHome.matchAll(/data-chunk-ids="([^"]*)"/g)].map((m) => m[1]);
    const idsNext = [...home.matchAll(/data-chunk-ids="([^"]*)"/g)].map((m) => m[1]);
    if (JSON.stringify(idsCur) !== JSON.stringify(idsNext)) diffs.push('index.html (chunk ids)');
    const browseCur = (currentHome.match(/Browse all (\d+) prompts/) || [])[1];
    const browseNext = (home.match(/Browse all (\d+) prompts/) || [])[1];
    if (browseCur !== browseNext) diffs.push('index.html (browse link)');

    if (diffs.length) {
      console.error('Generated files are out of date:\n  - ' + diffs.join('\n  - '));
      console.error('Run: node scripts/generate.mjs');
      process.exit(1);
    }
    console.log(`OK: ${lessons.length} lessons, ${prompts.length} prompts in sync.`);
    return;
  }

  write('library.html', library);
  write('assets/js/search-index.js', searchIndex);
  write('index.html', home);
  console.log(`Wrote library.html, search-index.js, and home prompt counts (${prompts.length} prompts, ${lessons.length} lessons).`);
}

main();
