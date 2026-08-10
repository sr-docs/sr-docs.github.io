(function () {
  const article = document.getElementById("blog-article");
  const toc = document.querySelector(".blog-toc");
  if (!article || !toc) return;

  const links = Array.from(toc.querySelectorAll("a[data-post]"));
  const defaultPost = links[0] ? links[0].dataset.post : null;

  function setActive(slug) {
    links.forEach((link) => {
      const active = link.dataset.post === slug;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function updateTitle(doc) {
    const titleEl = doc.querySelector("title");
    if (titleEl) {
      const name = titleEl.textContent.split("·")[0].trim();
      document.title = name + " · Blog · Sabita Rao's Portfolio";
    }
  }

  async function loadPost(slug, { push = true } = {}) {
    if (!slug) return;
    setActive(slug);
    article.innerHTML = '<p class="blog-reader-empty">Loading…</p>';

    try {
      const res = await fetch(slug + ".html", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Post not found");
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const source = doc.querySelector("article.prose");
      if (!source) throw new Error("Missing article");

      const back = source.querySelector(".post-back");
      if (back) back.remove();

      article.innerHTML = source.innerHTML;
      updateTitle(doc);

      if (push) {
        const url = new URL(window.location.href);
        url.searchParams.set("post", slug);
        history.pushState({ post: slug }, "", url);
      }

      article.closest(".blog-reader")?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      article.innerHTML =
        '<p class="blog-reader-empty">Couldn’t load that post. <a href="' +
        slug +
        '.html">Open it directly</a>.</p>';
    }
  }

  toc.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-post]");
    if (!link) return;
    event.preventDefault();
    loadPost(link.dataset.post);
  });

  window.addEventListener("popstate", () => {
    const slug = new URL(window.location.href).searchParams.get("post") || defaultPost;
    loadPost(slug, { push: false });
  });

  const initial = new URL(window.location.href).searchParams.get("post") || defaultPost;
  if (initial) loadPost(initial, { push: false });
})();
