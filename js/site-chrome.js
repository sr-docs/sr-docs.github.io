(() => {
  if (window.__srDocsChrome || !document.body) return;
  window.__srDocsChrome = true;

  try {
    const stored =
      localStorage.getItem("sr-theme") || localStorage.getItem("theme-f33");
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    document.documentElement.setAttribute("data-theme", "light");
  }

  const isAppShell = Boolean(document.getElementById("__docusaurus"));

  // Always load chrome-only CSS. Full /css/styles.css redefines --ink, body
  // background, and fonts and washes out self-contained project themes
  // (Interactive IA, Purpose, NimbusWiz, etc.).
  const header = `
    <header class="site-header site-header--embed" style="position:sticky;top:0;z-index:9999;">
      <div class="header-start">
        <a class="brand" href="/index.html">Sabita Rao's <span>Portfolio</span></a>
        <nav class="nav nav--primary" aria-label="Primary">
          <a href="/index.html">Home</a>
          <a href="/projects/index.html" aria-current="page">Projects</a>
          <a href="/blog/index.html">Blog</a>
        </nav>
      </div>
      <div class="header-tools">
        <nav class="nav nav--meta" aria-label="About and social">
          <a href="/about.html">About</a>
          <a
            href="https://linkedin.com/in/sabitarao"
            target="_blank"
            rel="noopener noreferrer"
            >LinkedIn</a
          >
          <a
            href="https://github.com/sr-docs"
            target="_blank"
            rel="noopener noreferrer"
            >GitHub</a
          >
        </nav>
      </div>
    </header>
  `;

  const footer = `
    <footer class="site-footer site-footer--embed">
      <p>
        <a href="/index.html">Home</a>
        ·
        <a href="/projects/index.html">All projects</a>
        ·
        <a href="https://github.com/sr-docs">GitHub</a>
        · Copyright © Sabita Rao
      </p>
    </footer>
  `;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/embed-chrome.css";
  document.head.appendChild(link);

  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap";
  document.head.appendChild(font);

  if (!document.querySelector('link[rel="icon"]')) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = "/favicon.ico";
    icon.sizes = "any";
    document.head.appendChild(icon);
  }

  const appRoot = document.getElementById("__docusaurus");
  if (appRoot) {
    // Keep chrome as siblings of the app root (not after deferred scripts).
    appRoot.insertAdjacentHTML("beforebegin", header);
    appRoot.insertAdjacentHTML("afterend", footer);
  } else {
    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.insertAdjacentHTML("beforeend", footer);
  }
  document.body.classList.add("has-site-chrome");

  const theme = document.createElement("script");
  theme.src = "/js/theme.js";
  document.body.appendChild(theme);
})();
