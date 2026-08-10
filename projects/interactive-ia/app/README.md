# Designing Information Architecture — an interactive course

A self-paced, browser-based course that teaches information architecture in small
units, each pairing a concept with an exercise that has to be answered before the
explanation appears. Twelve teaching chapters cover IA from first principles
through search design; two appendix chapters provide a toolkit of fill-in AI
prompts for IA and research-synthesis work.

No build step, no dependencies, no backend. Open `index.html` in a browser and it
runs.

## Provenance and originality

The **topic sequence and conceptual scaffolding** are inspired by a
Packt Publishing textbook on information architecture. That book is the source of
the subject-matter outline only.

**Every word of prose, every exercise, every scenario, every distractor, and every
AI prompt in this repository is original and written for this course.** All
worked examples are fictional. The organizations, products, teams, page counts,
research findings, and quoted user statements throughout are invented to
illustrate a concept — none describe a real company, and none should be cited as
evidence about one. Where an exercise needs a number ("a 400-page intranet",
"three of eight participants"), that number is illustrative.

No text, figures, exercises, or data were reproduced from the source textbook or
from any other copyrighted work.

## Why it's built this way

### Commit-then-reveal

Each chunk asks a question and keeps the explanation hidden until the reader
commits an answer. This is the one pedagogical decision the whole structure rests
on. Reading an explanation feels like learning; retrieving an answer, being
wrong, and *then* reading the explanation actually is. Once you commit to that,
two things follow:

- **The answer must genuinely be unavailable beforehand.** Hiding it with CSS is
  not enough — it stays in the accessibility tree and in find-in-page, so a
  screen reader user or anyone pressing Ctrl+F gets the answer for free while a
  sighted mouse user does not. Feedback sections therefore carry the `hidden`
  attribute, which `assets/js/progress.js` removes on commit.
- **Committing has to be low-stakes.** Answers aren't graded and aren't scored.
  Every exercise has a **Try again** control that clears the answer and re-hides
  the explanation, so a wrong guess costs nothing.

### Small, independent chunks

89 chunks across 12 chapters, each a standalone page with one concept and one
exercise. Chapters can be read in any order and chunks resumed at any point.
This keeps each page short enough to finish in a sitting and makes the course
usable as a reference after a first pass, not just as a linear read.

### Fill-in AI prompts

59 prompts across the course and its two appendix chapters. Each is a template
with labeled placeholders that update live as the reader types, plus a
breakdown of how the prompt is constructed — most against the RICE frame
(Role, Instructions, Context, Expected format). The point is not to hand over
prompts to paste but to make their structure legible, so a reader can write their
own.

Prompts are indexed twice: in place, on the chunk that teaches the relevant
concept, and centrally in `library.html`, filterable by category, for readers who
arrive knowing what they need. The prompts that generate research synthesis are
deliberately paired with prompts that validate it, because a model asked to
synthesise research will produce something that reads like a finding whether or
not the data supports it.

### No build step

The whole course is static HTML, one CSS file, and four small JavaScript files
with no dependencies. It can be opened from a local folder with no server, works
offline, and will still work in a decade. The cost of that choice is real and
is listed under [Known limitations](#known-limitations).

### Progress without accounts

Progress lives in `localStorage` under the `ia-course:` prefix. There is no
sign-in, nothing is transmitted anywhere, and the course works with storage
disabled — you just lose progress tracking. Prompt fields are saved the same way,
so a half-filled prompt survives navigating away. The course home page has a
**Reset all progress** control that clears both.

## Scope

| | |
|---|---|
| Teaching chapters | 12 |
| Appendix (toolkit) chapters | 2 |
| Chunks | 89 |
| Fill-in AI prompts | 59 |
| CSS | 1 file |
| JavaScript | 4 files, no dependencies |
| Build tooling | none |
| Backend | none |

## Structure

```
index.html              Course home: chapter cards, progress, site search
library.html            All 59 prompts, filterable by category
chapters/ch01..ch14/
  index.html            Chapter contents with per-chunk completion state
  chunk-NN.html         One concept + one exercise (+ optional AI prompt)
assets/css/style.css    Single stylesheet; design tokens in :root
assets/js/
  progress.js           localStorage progress, commit/reveal, retry, reset
  prompt-fill.js        Live prompt templating and clipboard handling
  library.js            Prompt library filtering
  site-search.js        Client-side search over search-index.js
  search-index.js       Hand-maintained search index
```

### Design tokens

The palette is deliberately small and named for what it means rather than what it
looks like: `--ground`, `--ink`, `--structure` (interactive), `--trace`
(borders), `--found` (success and prompt affordances).

Secondary text uses `--ink-muted` and `--ink-subtle` rather than reduced opacity.
Opacity was the original approach and it failed WCAG AA at the levels used —
a token that always resolves to a known contrast ratio (6.9:1 and 4.9:1 against
both backgrounds in use) is harder to get wrong than a percentage.

## Running it

Open `index.html` directly, or serve the directory:

```bash
npx serve .
```

Serving over HTTP is worth it for one reason: the async clipboard API needs a
secure context, so **Copy prompt** over `file://` falls back to a legacy copy
path and, failing that, selects the prompt text and tells the reader to press
Ctrl+C. It works either way, just less smoothly from the filesystem.

## Known limitations

Honest list, roughly in order of how much they'd matter to someone using this
seriously.

- **Exercises are not graded.** Committing an answer reveals the explanation
  regardless of what was selected. The explanation names the correct option and
  says why the others are wrong, so a reader can self-check — but the course
  does not tell them whether they were right, and it records completion rather
  than correctness. The scoring logic is deliberately absent, not missing by
  accident; adding it means deciding what a "wrong" answer should cost, and that
  decision hasn't been made yet.
- **Free-text justifications are not evaluated.** Several exercises ask the
  reader to explain their reasoning. Nothing reads it. Its value is entirely in
  the writing, which is defensible pedagogically but is not what most readers
  expect from a text box.
- **Generated surfaces can still drift if you skip the script.** `library.html`,
  `assets/js/search-index.js`, and the home-page prompt counts / time estimates
  are produced by `scripts/generate.mjs`. CI runs `--check` so a PR that forgets
  to regenerate should fail; local edits that skip the script will not.
- **Search is substring matching over a fixed index.** No stemming, no fuzzy
  matching, no ranking beyond field precedence. "Navigation" finds nothing that
  only says "navigate".
- **Progress is per-browser.** No accounts, no sync, no export. Clearing site
  data loses everything.
- **Two appendix chapters have no exercises.** Chapters 13 and 14 are prompt
  toolkits: concept plus prompt, no commit-then-reveal. They are excluded from
  progress tracking for that reason, which is why the home page counts teaching
  chunks across 12 chapters rather than all 14.
- **Not tested against real assistive technology.** The markup follows the
  practices it should — landmarks, real form controls, visible focus, contrast
  above AA, answers absent from the accessibility tree before commit — but that
  is reasoning about correctness, not evidence of it. No screen reader run has
  been done.

## Accessibility notes

What has been done deliberately, so a reviewer can check the claims:

- All text meets WCAG AA contrast (4.5:1) against the background it sits on.
  Muted text uses fixed tokens, not opacity, so the ratio is knowable.
- The root font size is left at the browser default, so a reader who has raised
  their default text size gets larger text. An earlier `html { font-size: 16px }`
  silently overrode that preference.
- Exercise answers are `hidden` before commit, keeping them out of the
  accessibility tree and out of find-in-page — the same information available to
  every reader at the same time.
- On commit, focus moves into the revealed explanation rather than being left
  behind on a button that has just disappeared.
- Completion indicators carry an accessible name that changes with their state,
  so they are not silent dots.
- Every interactive control is a real `<button>`, `<a>`, `<input>`, or `<label>`
  and is keyboard-operable with a visible focus ring.

## Style

American English (en-US) is the course locale — *organization*, *labeling*, *catalog*, *behavior*. British spellings that slipped in during drafting were normalized to match the majority of the existing prose.

## Design rationale

See [DESIGN.md](DESIGN.md) for why the course uses small chunks and commit-before-reveal.

## Maintaining generated files

Three surfaces are generated from the chunk HTML and `scripts/prompt-meta.json`:

```bash
node scripts/generate.mjs          # write library.html, search-index.js, home counts/ETAs
node scripts/generate.mjs --check  # fail if those files drift
node scripts/check-links.mjs       # local href + fragment integrity
```

CI runs the check and link scripts on every push (`.github/workflows/check.yml`). After adding or renaming a prompt, update `scripts/prompt-meta.json` (category + purpose + title), then regenerate.
