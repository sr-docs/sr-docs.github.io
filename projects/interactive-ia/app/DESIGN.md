# Design rationale

Why this course is built as small chunks with a commit-before-reveal exercise loop.

## The problem it is solving

Most IA primers are either long-form chapters you finish once, or slide decks you watch and forget. Neither forces a decision. The pedagogical bet behind this course is that **retrieving an answer, being wrong, and then reading the explanation** teaches more than reading the explanation alone — and that the unit of work has to be small enough that people actually finish it.

## Chunking

Each lesson page is one concept and one exercise. That is deliberate.

- **One idea per page.** A chunk that tries to teach taxonomy *and* labeling *and* navigation becomes a chapter again. The reader cannot tell what they were supposed to leave knowing.
- **Independence.** Chapters can be opened in any order, and a chunk can be revisited months later without re-reading the whole course. Progress is stored per chunk for the same reason.
- **A sitting you can finish.** Roughly eight minutes of reading and deciding is the design target. The home page shows an estimated time per chapter so a "chapter" is not a surprise hour.

The cost of chunking is real: cross-references have to be maintained, and some topics want more continuous prose. We accept that cost because the alternative — long pages that look complete but are abandoned halfway — fails the actual user of a self-paced course.

## Commit before reveal

The exercise answer key is present in the HTML but marked `hidden` until the reader commits. That choice has three parts.

1. **Commitment before explanation.** If the answer is visible, the exercise is a reading check. If it is hidden until commit, the reader has to prefer one option. Wrong answers are welcome; the feedback is written for them.
2. **Same information for everyone.** Hiding with CSS alone left the answers in the accessibility tree and in find-in-page. Screen-reader users and anyone using Ctrl+F got the key for free. The `hidden` attribute removes that asymmetry.
3. **Low stakes.** Answers are not graded. **Try again** clears the attempt and re-hides the key. Completion means "you engaged the loop," not "you scored 100%."

We intentionally do not auto-score selections. Scoring would change the emotional contract of the course — from practice to test — and would require deciding what a wrong answer costs. That decision is still open; until it is made, commit-to-reveal without a grade is the honest design.

## What we are not optimizing for

- **Accounts and sync.** Progress lives in `localStorage` so the course works offline and without a backend. That is a product choice, not a missing feature.
- **A single linear path.** The home grid is a map, not a syllabus order police. Sequence is suggested by next-chapter links; it is not enforced.
- **Prompt magic.** The AI prompts are templates with visible structure (often RICE). The point is to make the prompt's bones legible so a reader can write their own, not to ship a black-box assistant.

## How to judge whether this is working

If readers finish chunks, use **Try again**, and can explain a concept in their own words in the justification box, the design is doing its job. If they skip straight to the library prompts without the exercises, the course is being used as a toolkit — also valid, which is why the library exists as a first-class surface.
