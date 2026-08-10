/**
 * Copy content-portfolio → staging, patch for SR Docs embed, build into
 * projects/nimbuswiz/. Never writes to the source folder.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE =
  "C:\\Users\\Sabita\\Documents\\2026\\TW-IA-Content-System\\content-portfolio";
const STAGING = path.join(ROOT, "tools", "nimbuswiz-staging");
const OUT = path.join(ROOT, "projects", "nimbuswiz");
const OUT_NEXT = path.join(ROOT, "projects", "nimbuswiz-next");
const OUT_OLD = path.join(ROOT, "projects", "nimbuswiz-old");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "build",
  ".docusaurus",
  ".cache",
]);

function assertSourceReadable() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source not found (read-only input):\n  ${SOURCE}`);
    process.exit(1);
  }
  const pkg = path.join(SOURCE, "package.json");
  if (!fs.existsSync(pkg)) {
    console.error(`Source is not a Docusaurus project:\n  ${pkg}`);
    process.exit(1);
  }
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(from), to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function installDeps() {
  // Install in staging only — never junction source node_modules (build
  // caches can write through a link and mutate the read-only source).
  console.log("Installing dependencies in staging (npm ci)…");
  const r = spawnSync("npm", ["ci"], {
    cwd: STAGING,
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function read(rel) {
  return fs.readFileSync(path.join(STAGING, rel), "utf8");
}

function write(rel, content) {
  const abs = path.join(STAGING, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

function patchConfig() {
  let cfg = read("docusaurus.config.js");

  cfg = cfg
    .replace(
      /url:\s*'https:\/\/sabitarao\.github\.io'/,
      "url: 'https://sr-docs.github.io'"
    )
    .replace(/baseUrl:\s*'\/'/, "baseUrl: '/projects/nimbuswiz/'")
    .replace(
      /organizationName:\s*'sabitarao'/,
      "organizationName: 'sr-docs'"
    )
    .replace(
      /projectName:\s*'sabitarao\.github\.io'/,
      "projectName: 'sr-docs.github.io'"
    );

  // Docs: exclude live-experiments; disable last-update (staging has no git history).
  cfg = cfg.replace(
    /docs:\s*\{\s*sidebarPath:/,
    `docs: {\n          exclude: ['**/live-experiments/**'],\n          sidebarPath:`
  );
  cfg = cfg.replace(
    /showLastUpdateTime:\s*true/,
    "showLastUpdateTime: false"
  );

  // Disable blog plugin.
  cfg = cfg.replace(
    /blog:\s*\{[\s\S]*?\n\s*\},(\s*\n\s*theme:)/,
    "blog: false,$1"
  );

  // pathname:// is stripped by useBaseUrl without prepending baseUrl.
  const navbarItems = `
        items: [
          {
            href: 'pathname:///index.html',
            label: 'SR Docs',
            position: 'left',
          },
          {
            href: 'pathname:///projects/index.html',
            label: 'Projects',
            position: 'left',
          },
          {
            href: 'pathname:///blog/index.html',
            label: 'Blog',
            position: 'left',
          },
          {
            href: 'https://linkedin.com/in/sabitarao',
            label: 'LinkedIn',
            position: 'right',
          },
          {
            href: 'https://github.com/sabitarao',
            label: 'GitHub',
            position: 'right',
          },
        ],`;

  cfg = cfg.replace(/items:\s*\[[\s\S]*?\],\s*\n\s*\},(\s*\n\s*footer:)/, `${navbarItems}\n      },$1`);

  cfg = cfg.replace(
    /copyright:\s*`[^`]+`/,
    'copyright: `© ${new Date().getFullYear()} Sabita Rao | <a href="/projects/nimbuswiz/">NimbusWiz</a> | <a href="/index.html">SR Docs</a>`'
  );

  write("docusaurus.config.js", cfg);
}

function patchSidebars() {
  let sidebars = read("sidebars.ts");
  // Drop liveExperimentsSidebar so excluded docs are not referenced.
  sidebars = sidebars.replace(
    /,\s*liveExperimentsSidebar:\s*\[[\s\S]*?\],\s*\n\};/,
    "\n};"
  );
  write("sidebars.ts", sidebars);
}

function patchDocsHome() {
  let home = read("docs/index.md");
  // Remove Independent AI projects card (9).
  home = home.replace(
    /\n<Link className="card" to="\.\/live-experiments\/">[\s\S]*?<\/Link>\n/,
    "\n"
  );
  // Blog card → raw <a> so Docusaurus Link cannot re-apply baseUrl on hydrate.
  home = home.replace(
    /<Link className="card" to="\/blog\/">([\s\S]*?)<\/Link>/,
    `<a className="card" href="/blog/index.html">$1</a>`
  );
  home = home.replace(
    /<div className="card-number">10\. <strong>Blog<\/strong><\/div>/,
    `<div className="card-number">9. <strong>Blog</strong></div>`
  );
  write("docs/index.md", home);
}

/**
 * Convert blog markdown / Link targets into raw <a href="/blog/..."> tags.
 * Docusaurus Link + useBaseUrl would otherwise turn /blog/X into
 * /projects/nimbuswiz/blog/X under this embed's baseUrl.
 */
function rewriteBlogLinks(rel) {
  let text = read(rel);
  text = text.replace(
    /\[([^\]]+)\]\(https:\/\/sabitarao\.github\.io\/blog\/([a-z0-9-]+)\/?\)/g,
    '<a href="/blog/$2.html">$1</a>'
  );
  text = text.replace(
    /\[([^\]]+)\]\(pathname:\/\/\/blog\/([a-z0-9-]+)\.html\)/g,
    '<a href="/blog/$2.html">$1</a>'
  );
  text = text.replace(
    /\[([^\]]+)\]\(\/blog\/([a-z0-9-]+)\/?\)/g,
    '<a href="/blog/$2.html">$1</a>'
  );
  text = text.replace(
    /\[([^\]]+)\]\(pathname:\/\/\/blog\/index\.html\)/g,
    '<a href="/blog/index.html">$1</a>'
  );
  text = text.replace(
    /\[([^\]]+)\]\(\/blog\/?\)/g,
    '<a href="/blog/index.html">$1</a>'
  );
  text = text.replace(
    /\b(?:to|href)="(?:pathname:\/\/\/)?\/blog\/([a-z0-9-]+)(?:\.html)?\/?"/g,
    'href="/blog/$1.html"'
  );
  text = text.replace(
    /\b(?:to|href)="(?:pathname:\/\/\/)?\/blog(?:\/index\.html)?\/?"/g,
    'href="/blog/index.html"'
  );
  write(rel, text);
}

function patchBlogDeepLinks() {
  const files = [
    "docs/product-ideation/index.md",
    "docs/information-architecture/index.md",
    "docs/technical-documentation/docs-qa/index.mdx",
    "docs/docs-as-code/ai-draft-generation.md",
    "docs/ai-experiments/notion-audits.md",
  ];
  for (const rel of files) {
    if (fs.existsSync(path.join(STAGING, rel))) rewriteBlogLinks(rel);
  }
}

function removeLiveExperimentsDir() {
  const dir = path.join(STAGING, "docs", "live-experiments");
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function rmOutDir() {
  // Windows sometimes leaves ENOTEMPTY on first attempt during Docusaurus cleanup.
  for (let i = 0; i < 5; i++) {
    if (!fs.existsSync(OUT)) return;
    try {
      fs.rmSync(OUT, { recursive: true, force: true });
      return;
    } catch (err) {
      if (i === 4) throw err;
      spawnSync(process.execPath, ["-e", `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${200 * (i + 1)})`]);
    }
  }
}

function runBuild() {
  // Build to a fresh folder, then swap — avoids EPERM when preview has files locked.
  if (fs.existsSync(OUT_NEXT)) fs.rmSync(OUT_NEXT, { recursive: true, force: true });

  console.log("Building Docusaurus embed…");
  const r = spawnSync(
    "npx",
    ["docusaurus", "build", "--out-dir", OUT_NEXT],
    {
      cwd: STAGING,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, NODE_ENV: "production" },
    }
  );
  if (r.status !== 0) {
    console.error("Docusaurus build failed.");
    process.exit(r.status ?? 1);
  }
}

function activateBuild() {
  if (fs.existsSync(OUT_OLD)) {
    try {
      fs.rmSync(OUT_OLD, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
  if (fs.existsSync(OUT)) {
    try {
      fs.renameSync(OUT, OUT_OLD);
      fs.renameSync(OUT_NEXT, OUT);
    } catch {
      // Preview server may lock assets; mirror HTML/JS/content over the live tree.
      console.warn("Rename locked; copying build over projects/nimbuswiz via robocopy…");
      const r = spawnSync(
        "robocopy",
        [OUT_NEXT, OUT, "/E", "/IS", "/IT", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS"],
        { shell: true }
      );
      // robocopy: 0–7 = success with varying copy stats; >=8 = failure
      if ((r.status ?? 0) >= 8) {
        spawnSync(
          "robocopy",
          [OUT_NEXT, OUT, "*.html", "*.js", "/E", "/IS", "/IT", "/R:1", "/W:1"],
          { shell: true }
        );
      }
      try {
        fs.rmSync(OUT_NEXT, { recursive: true, force: true });
      } catch {
        console.warn("Could not delete projects/nimbuswiz-next (file lock). Safe to remove later.");
      }
    }
  } else {
    fs.renameSync(OUT_NEXT, OUT);
  }
  if (fs.existsSync(OUT_OLD)) {
    try {
      fs.rmSync(OUT_OLD, { recursive: true, force: true });
    } catch {
      console.warn("Could not delete projects/nimbuswiz-old (file lock). Safe to remove later.");
    }
  }
}

const BLOG_REDIRECT_SLUGS = [
  "index",
  "ai-assisted-docs-pipeline-guide",
  "why-i-documented-a-fictional-product",
  "structure-before-sentences",
  "notion-mcp-audits",
  "analysis-paralysis",
];

/**
 * Docusaurus Link/useBaseUrl often prefixes baseUrl onto /blog/... paths.
 * Rewrite built assets and emit redirect stubs so wrong URLs still recover.
 */
function rewriteBuiltLinks(rootDir = OUT) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!/\.(html|js|json|xml|txt|css|map)$/i.test(entry.name)) continue;
      let text = fs.readFileSync(abs, "utf8");
      const next = text
        .replaceAll("/projects/nimbuswiz/blog/", "/blog/")
        .replaceAll('href="/projects/nimbuswiz/projects/index.html"', 'href="/projects/index.html"')
        .replaceAll("href=/projects/nimbuswiz/projects/index.html", "href=/projects/index.html")
        .replaceAll("pathname:///blog/", "/blog/")
        .replaceAll("pathname:///index.html", "/index.html")
        .replaceAll("pathname:///projects/index.html", "/projects/index.html");
      if (next !== text) fs.writeFileSync(abs, next, "utf8");
    }
  };
  console.log("Rewriting site-root blog/nav links in build output…");
  walk(rootDir);
  writeBlogRedirectStubs(rootDir);
  injectBlogLinkFixer(rootDir);
  injectSiteChrome(rootDir);
}

function writeBlogRedirectStubs(rootDir = OUT) {
  const dir = path.join(rootDir, "blog");
  fs.mkdirSync(dir, { recursive: true });
  for (const slug of BLOG_REDIRECT_SLUGS) {
    const file = slug === "index" ? "index.html" : `${slug}.html`;
    const target = `/blog/${file}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta http-equiv="refresh" content="0;url=${target}"/>
<link rel="canonical" href="${target}"/>
<script>location.replace(${JSON.stringify(target)})</script>
<title>Redirecting…</title>
</head>
<body>
<p><a href="${target}">Continue to blog post</a></p>
</body>
</html>
`;
    fs.writeFileSync(path.join(dir, file), html, "utf8");
  }
  console.log(`Wrote ${BLOG_REDIRECT_SLUGS.length} blog redirect stubs under projects/nimbuswiz/blog/`);
}

/** Runtime safety net if client hydration re-applies baseUrl to /blog links. */
function injectBlogLinkFixer(rootDir = OUT) {
  const marker = "data-sr-docs-blog-fix";
  // Build path in JS at runtime so post-pass replaceAll("/projects/nimbuswiz/blog/") cannot corrupt it.
  const snippet = `<script ${marker}>(function(){var bad="/"+["projects","nimbuswiz","blog"].join("/")+"/";function fix(h){if(!h)return h;return h.indexOf(bad)===0?"/blog/"+h.slice(bad.length):h}document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a");if(!a)return;var href=a.getAttribute("href");var next=fix(href);if(next&&next!==href){e.preventDefault();if(a.target==="_blank")window.open(next,"_blank","noopener");else location.assign(next)}},true);document.querySelectorAll("a[href*='nimbuswiz/blog']").forEach(function(a){a.setAttribute("href",fix(a.getAttribute("href")))});})();</script>`;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "blog") continue; // don't inject into redirect stubs
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      let text = fs.readFileSync(abs, "utf8");
      if (text.includes(marker) || !text.includes("</body>")) continue;
      text = text.replace("</body>", `${snippet}</body>`);
      fs.writeFileSync(abs, text, "utf8");
    }
  };
  walk(rootDir);
}

/** Same portfolio chrome as other hosted projects (Home / Projects / Blog / About). */
function injectSiteChrome(rootDir = OUT) {
  const tag = '<script src="/js/site-chrome.js"></script>';
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "blog") continue;
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      let text = fs.readFileSync(abs, "utf8");
      if (text.includes("/js/site-chrome.js") || !text.includes("</body>")) continue;
      text = text.replace("</body>", `${tag}</body>`);
      fs.writeFileSync(abs, text, "utf8");
    }
  };
  console.log("Injecting site-chrome.js into embed pages…");
  walk(rootDir);
}

/** Fix known relative link that breaks under trailingSlash:false + baseUrl. */
function patchRelativeDocLinks() {
  const rel = "docs/technical-documentation/index.md";
  if (!fs.existsSync(path.join(STAGING, rel))) return;
  let text = read(rel);
  text = text.replace(
    "](../product-ideation)",
    "](/product-ideation)"
  );
  write(rel, text);
}

function main() {
  if (process.argv.includes("--activate-next")) {
    if (!fs.existsSync(path.join(OUT_NEXT, "index.html"))) {
      console.error("projects/nimbuswiz-next/index.html missing");
      process.exit(1);
    }
    rewriteBuiltLinks(OUT_NEXT);
    activateBuild();
    console.log("Activated projects/nimbuswiz-next → projects/nimbuswiz/");
    return;
  }

  assertSourceReadable();
  console.log("Source (read-only):", SOURCE);
  console.log("Staging:", STAGING);
  console.log("Output:", OUT);

  if (fs.existsSync(STAGING)) fs.rmSync(STAGING, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(STAGING), { recursive: true });

  console.log("Copying project (excluding node_modules)…");
  copyTree(SOURCE, STAGING);
  installDeps();

  console.log("Patching staging for SR Docs embed…");
  patchConfig();
  patchSidebars();
  patchDocsHome();
  patchBlogDeepLinks();
  patchRelativeDocLinks();
  removeLiveExperimentsDir();

  runBuild();
  rewriteBuiltLinks(OUT_NEXT);
  activateBuild();

  if (!fs.existsSync(path.join(OUT, "index.html"))) {
    console.error("Build finished but projects/nimbuswiz/index.html is missing.");
    process.exit(1);
  }

  console.log("Done. Embedded site → projects/nimbuswiz/");
}

main();
