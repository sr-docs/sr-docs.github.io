(() => {
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

  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = "/favicon.ico";
    link.sizes = "any";
    document.head.appendChild(link);
  }
})();
