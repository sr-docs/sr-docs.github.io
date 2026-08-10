(() => {
  const frame = document.getElementById("project-frame");
  if (!frame) return;

  const target = frame.dataset.src;
  if (!target) return;

  // Absolute site paths are preferred (avoid clean-URL / directory quirks).
  if (target.startsWith("/")) {
    frame.src = target;
    return;
  }

  const url = new URL(window.location.href);
  let path = url.pathname;

  // Resolve relative targets from this folder, even without a trailing slash.
  if (/\/index\.html?$/i.test(path) || /\/index$/i.test(path)) {
    path = path.replace(/\/index(\.html)?$/i, "/");
  } else if (/\.[a-z0-9]+$/i.test(path)) {
    path = path.replace(/\/[^/]+$/, "/");
  } else if (!path.endsWith("/")) {
    path += "/";
  }

  url.pathname = path;
  url.search = "";
  url.hash = "";

  let href = new URL(target, url).href;
  // Keep .html extension — never let the path collapse to a bare segment.
  if (target.endsWith(".html") && !href.endsWith(".html")) {
    href = href.replace(/\/?$/, "") + ".html";
  }
  if (target.endsWith("/") && !href.endsWith("/")) {
    href += "/";
  }

  frame.src = href;
})();
