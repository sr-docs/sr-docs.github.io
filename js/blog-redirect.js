(function () {
  const file = location.pathname.split("/").pop() || "";
  if (!file.endsWith(".html") || file === "index.html") return;
  const slug = file.replace(/\.html$/i, "");
  location.replace("index.html?post=" + encodeURIComponent(slug));
})();
