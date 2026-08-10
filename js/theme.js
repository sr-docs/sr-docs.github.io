(() => {
  const STORAGE_KEY = "sr-theme";
  const DOCUSAURUS_KEY = "theme-f33";

  const sun = `
    <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0-5.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 2.25Zm0 16.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM4.22 4.22a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L4.22 5.28a.75.75 0 0 1 0-1.06Zm13.44 13.44a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM2.25 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 2.25 12Zm16.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM5.28 18.72a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06L6.34 18.72a.75.75 0 0 1-1.06 0Zm13.44-13.44a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 1.06L19.78 5.28a.75.75 0 0 1-1.06 0Z"/>
    </svg>
  `;

  const moon = `
    <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12.3 3.07a.75.75 0 0 1 .82.95 7.5 7.5 0 1 0 6.86 6.86.75.75 0 0 1 .95.82A9 9 0 1 1 12.3 3.07Z"/>
    </svg>
  `;

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function readStored() {
    try {
      const value =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(DOCUSAURUS_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  }

  function currentTheme() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return readStored() || systemTheme();
  }

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem(DOCUSAURUS_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }

    document.querySelectorAll(".theme-toggle").forEach((button) => {
      const isDark = next === "dark";
      button.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
      button.setAttribute("aria-pressed", String(isDark));
      button.title = isDark ? "Light mode" : "Dark mode";
    });
  }

  function ensureToggle(header) {
    if (!header || header.querySelector(".theme-toggle")) return;

    let tools = header.querySelector(".header-tools");
    if (!tools) {
      tools = document.createElement("div");
      tools.className = "header-tools";
      const meta = header.querySelector(".nav--meta");
      if (meta) {
        meta.replaceWith(tools);
        tools.appendChild(meta);
      } else {
        header.appendChild(tools);
      }
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.innerHTML = `${moon}${sun}`;
    tools.appendChild(button);
  }

  function mount() {
    document
      .querySelectorAll(".site-header")
      .forEach((header) => ensureToggle(header));

    applyTheme(currentTheme());

    document.addEventListener("click", (event) => {
      const button = event.target.closest(".theme-toggle");
      if (!button) return;
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  // Apply as early as this file runs (usually end of body).
  applyTheme(currentTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!readStored()) applyTheme(systemTheme());
    });
})();
