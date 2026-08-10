(() => {
  const sections = document.querySelectorAll(".section");
  if (!sections.length || !("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
  }

  document.querySelectorAll(".card-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".card--project");
      const moreId = button.getAttribute("aria-controls");
      const more = moreId ? document.getElementById(moreId) : null;
      if (!card || !more) return;

      const expanded = card.classList.toggle("is-expanded");
      button.setAttribute("aria-expanded", String(expanded));
      button.textContent = expanded ? "Show Less" : "Tools Used";
      more.setAttribute("aria-hidden", String(!expanded));
    });
  });
})();
