import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { marked } from "marked";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE =
  "C:\\Users\\Sabita\\Documents\\2026\\TW-IA-Content-System\\content-portfolio\\blog";
const IMG_SOURCE =
  "C:\\Users\\Sabita\\Documents\\2026\\TW-IA-Content-System\\content-portfolio\\static\\img";
const BLOG_OUT = path.join(ROOT, "blog");
const IMG_OUT = path.join(ROOT, "assets", "img");

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

marked.setOptions({ gfm: true, breaks: false });

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[m[1]] = value;
  }
  return { meta, body: match[2] };
}

function plainExcerpt(body) {
  const before = body.split(/\{\/\*\s*truncate\s*\*\/\}/)[0] || body;
  const text = before
    .replace(/<[^>]+>/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 160) return text;
  const sliced = text.slice(0, 160);
  const sentence = sliced.match(/^(.+?[.!?])\s/)?.[1];
  if (sentence && sentence.length > 60) return sentence;
  return `${sliced.replace(/\s+\S*$/, "")}…`;
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function prepareMarkdown(body) {
  return body
    .replace(/\{\/\*\s*truncate\s*\*\/\}/g, "")
    .replace(/\]\(\/img\//g, "](../assets/img/")
    .replace(/(src|href)=["']\/img\//g, '$1="../assets/img/')
    .replace(/\s+target=(["'])[^"']*\1/gi, "")
    .replace(/\s+rel=(["'])noopener noreferrer\1/gi, "")
    .replace(/<p>\s*(!\[[^\]]*\]\([^)]+\))\s*/gi, "$1\n\n")
    .replace(/\s*Image credits:/g, "\n\nImage credits:")
    .replace(/<\/p>\s*<\/p>/g, "</p>");
}

function wrapPost({ title, description, dateIso, dateLabel, html }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Blog</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../css/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="../index.html">SR <span>Docs</span></a>
      <nav class="nav" aria-label="Primary">
        <a href="../index.html">Home</a>
        <a href="../projects/index.html">Projects</a>
        <a href="./" aria-current="page">Blog</a>
        <a href="../about.html">About</a>
      </nav>
    </header>

    <main>
      <article class="prose">
        <header class="post-header page-hero">
          <time datetime="${dateIso}">${dateLabel}</time>
          <h1>${escapeHtml(title)}</h1>
        </header>
${html}
        <p class="post-back"><a href="./">← Back to all posts</a></p>
      </article>
    </main>

    <footer class="site-footer">
      <p>
        <a href="../index.html">Home</a>
        ·
        <a href="https://github.com/sr-docs">GitHub</a>
        · Built for GitHub Pages
      </p>
    </footer>
    <script src="../js/main.js"></script>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapIndex(posts) {
  const items = posts
    .map(
      (post) => `          <li>
            <a href="${post.slug}.html">
              <span class="item-title">${escapeHtml(post.title)}</span>
              <span class="item-meta">${post.dateShort}</span>
              <p class="item-desc">${escapeHtml(post.description)}</p>
            </a>
          </li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog · SR Docs</title>
    <meta name="description" content="Writing on documentation, AI workflows, and content systems." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../css/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="../index.html">SR <span>Docs</span></a>
      <nav class="nav" aria-label="Primary">
        <a href="../index.html">Home</a>
        <a href="../projects/index.html">Projects</a>
        <a href="./" aria-current="page">Blog</a>
        <a href="../about.html">About</a>
      </nav>
    </header>

    <main>
      <header class="page-hero">
        <h1>Blog</h1>
        <p>Notes on documentation, AI-assisted workflows, and content systems.</p>
      </header>

      <section class="section is-visible">
        <ul class="post-list">
${items}
        </ul>
      </section>
    </main>

    <footer class="site-footer">
      <p>
        <a href="../index.html">Home</a>
        ·
        <a href="https://github.com/sr-docs">GitHub</a>
        · Built for GitHub Pages
      </p>
    </footer>
    <script src="../js/main.js"></script>
  </body>
</html>
`;
}

fs.mkdirSync(BLOG_OUT, { recursive: true });
fs.mkdirSync(IMG_OUT, { recursive: true });

const sourceFiles = fs
  .readdirSync(SOURCE)
  .filter((name) => /\.(md|mdx)$/i.test(name))
  .sort()
  .reverse();

const posts = [];
const imageNames = new Set();

for (const file of sourceFiles) {
  const dateIso = file.slice(0, 10);
  const raw = fs.readFileSync(path.join(SOURCE, file), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const slug = meta.slug || path.basename(file, path.extname(file));
  const title = (meta.title || slug).replace(/\\*/g, "");
  const description = plainExcerpt(body);
  const markdown = prepareMarkdown(body);

  for (const match of markdown.matchAll(/\.\.\/assets\/img\/([^)\s"']+)/g)) {
    imageNames.add(match[1]);
  }

  const html = marked.parse(markdown);
  const outPath = path.join(BLOG_OUT, `${slug}.html`);
  fs.writeFileSync(
    outPath,
    wrapPost({
      title,
      description,
      dateIso,
      dateLabel: formatDate(dateIso),
      html: indentBlock(html.trim(), 8),
    })
  );

  const [y, m, d] = dateIso.split("-");
  posts.push({
    slug,
    title: title.replace(/\*/g, ""),
    description,
    dateIso,
    dateShort: `${MONTHS[Number(m) - 1].slice(0, 3)} ${Number(d)}, ${y}`,
  });
}

for (const name of imageNames) {
  const from = path.join(IMG_SOURCE, name);
  const to = path.join(IMG_OUT, name);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
  } else {
    console.warn("Missing image:", name);
  }
}

const optimize = spawnSync(
  "python",
  [path.join(ROOT, "scripts", "optimize-images.py")],
  { cwd: ROOT, stdio: "inherit" }
);
if (optimize.status !== 0) {
  console.warn("Image optimize step failed; blog HTML may still point at originals");
}

function rewriteRasterToWebp(html) {
  return html.replace(
    /(src=["'](?:\.\.\/)?assets\/img\/)([^"']+)\.(png|jpe?g)(["'])/gi,
    (full, prefix, stem, _ext, quote) => {
      if (fs.existsSync(path.join(IMG_OUT, `${stem}.webp`))) {
        return `${prefix}${stem}.webp${quote}`;
      }
      return full;
    }
  );
}

for (const name of fs.readdirSync(BLOG_OUT)) {
  if (!name.endsWith(".html")) continue;
  const filePath = path.join(BLOG_OUT, name);
  fs.writeFileSync(
    filePath,
    rewriteRasterToWebp(fs.readFileSync(filePath, "utf8"))
  );
}

// Drop leftover Docusaurus build HTML and starter placeholders.
const keep = new Set(["index.html", ...posts.map((p) => `${p.slug}.html`)]);
for (const name of fs.readdirSync(BLOG_OUT)) {
  if (name.endsWith(".html") && !keep.has(name)) {
    fs.unlinkSync(path.join(BLOG_OUT, name));
  }
}

fs.writeFileSync(path.join(BLOG_OUT, "index.html"), wrapIndex(posts));
fs.writeFileSync(
  path.join(BLOG_OUT, "posts.json"),
  JSON.stringify(posts, null, 2)
);

console.log(`Converted ${posts.length} posts`);
console.log(`Copied ${imageNames.size} images`);

function indentBlock(text, spaces) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}
