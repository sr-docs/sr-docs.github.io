# SR Docs

Portfolio landing site for [sr-docs.github.io](https://sr-docs.github.io) — projects, static HTML demos, blog, and about.

## Structure

```
index.html          Home / landing
about.html          About
blog/               Blog index + posts
projects/           Project list + hosted static demos
css/ styles.css
js/ main.js
assets/             Hero art and other static assets
```

## Local preview

From this folder (keeps `.html` URLs so nested course links/CSS resolve):

```bash
npm run preview
```

Then open http://localhost:3456

## Deploy to GitHub Pages

1. Create a GitHub repo named **`sr-docs.github.io`** under the `sr-docs` account/org (required for `https://sr-docs.github.io`).
2. Push this project to that repo’s default branch.
3. In the repo: **Settings → Pages →** source = Deploy from branch → `main` / `/ (root)`.

Project sites in other repos appear at `https://sr-docs.github.io/<repo>/` when those repos enable Pages.

## Blog

Posts are converted from the Docusaurus source at  
`Documents\2026\TW-IA-Content-System\content-portfolio\blog`.

```bash
npm run convert-blog
```

That regenerates `blog/*.html`, `blog/index.html`, and copies images into `assets/img/`.

## NimbusWiz embed

The NimbusWiz content-systems case study is a Docusaurus build under `projects/nimbuswiz/`.  
Source is read-only: `Documents\2026\TW-IA-Content-System\content-portfolio` (never edited).  
The build copies into a gitignored staging dir, patches for this site, then emits static HTML.

```bash
npm run build:nimbuswiz
```

Live Experiments are excluded. Blog links in the case study point at this site’s `/blog/*.html` posts.

## Customize

- Replace placeholder project links in `index.html` and `projects/index.html`.
- Edit `about.html` with your bio and contact links.
- Add a hosted demo: create `projects/my-demo/index.html` and link it from `projects/index.html`.
