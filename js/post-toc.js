(function () {
  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function uniqueId(base, used) {
    let id = base || "section";
    let n = 2;
    while (used.has(id)) {
      id = base + "-" + n;
      n += 1;
    }
    used.add(id);
    return id;
  }

  const HEADER_OFFSET_PX = 88;

  function scrollToY(top) {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    // Two-arg scrollTo still honors CSS `scroll-behavior: smooth`; force auto.
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.max(0, top));
    html.style.scrollBehavior = previous;
  }

  function scrollToId(id) {
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    // Avoid native hash / scrollIntoView: CSS smooth scrolling plus the blog
    // reader's load-time scroll reset breaks fragment navigation in Chromium.
    const top =
      target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
    scrollToY(top);

    try {
      const url = new URL(window.location.href);
      url.hash = id;
      history.replaceState(history.state, "", url);
    } catch {
      /* ignore */
    }
  }

  /**
   * Insert a collapsible "On this page" TOC after the post header.
   * Skips posts with fewer than 2 h2/h3 headings.
   */
  function buildPostToc(article) {
    if (!article) return;

    const existing = article.querySelector(".post-toc");
    if (existing) existing.remove();

    const headings = Array.from(article.querySelectorAll("h2, h3"));
    if (headings.length < 2) return;

    const used = new Set(
      Array.from(article.querySelectorAll("[id]")).map((el) => el.id)
    );

    const list = document.createElement("ol");
    list.className = "post-toc__list";

    headings.forEach((heading) => {
      let id = heading.id;
      if (!id) {
        id = uniqueId(slugify(heading.textContent || "section"), used);
        heading.id = id;
      }

      const li = document.createElement("li");
      li.className =
        heading.tagName === "H3" ? "post-toc__item post-toc__item--h3" : "post-toc__item";

      const a = document.createElement("a");
      a.href = "#" + id;
      a.textContent = (heading.textContent || "").trim();
      li.appendChild(a);
      list.appendChild(li);
    });

    const details = document.createElement("details");
    details.className = "post-toc";

    const summary = document.createElement("summary");
    summary.textContent = "On this page";
    details.appendChild(summary);

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "On this page");
    nav.appendChild(list);
    details.appendChild(nav);

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a[href^='#']");
      if (!link || !nav.contains(link)) return;
      event.preventDefault();
      const id = decodeURIComponent((link.getAttribute("href") || "").slice(1));
      scrollToId(id);
    });

    const header = article.querySelector(".post-header");
    if (header) header.insertAdjacentElement("afterend", details);
    else article.insertBefore(details, article.firstChild);

    const hashId = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (hashId && article.querySelector("#" + CSS.escape(hashId))) {
      // Defer so layout settles after injection.
      requestAnimationFrame(() => scrollToId(hashId));
    }
  }

  window.buildPostToc = buildPostToc;
})();
