---
name: deconstruct-domain
description: Use at the start of learning a new domain, or when a curriculum needs rebuilding. Deconstructs a domain into a Pareto-ranked skill tree and saves it with learn_curriculum. Triggered by "break down X", "what should I learn first in Y", "make me a curriculum for Z".
---

# Deconstruct a Domain

Turn a fuzzy domain into a small, ordered skill tree where the highest-leverage 20% is explicit.

## Process

1. **Check course lifecycle.** Call `learn_course` with `action: "list"`. If another unfinished course is active, ask whether to pause it (retain progress) or end it (permanently delete it). Do not build the new curriculum until the user chooses.
2. **Define the target and card summary.** Ask what success looks like concretely (a task they want to do, not "know everything"). Then write `shortTitle`: a complete Chinese semantic summary of the course in at most 8 characters. If the obvious name is longer, rewrite its meaning; never cut off characters.
3. **List candidate sub-skills.** Brainstorm 10–25 elements, then aggregate near-duplicates. Every node gets a concise Chinese `title` and an accurate English `titleEn`. Chinese `title` is **at most 8 characters**, with no `：` subtitle or explanatory clause. If a draft exceeds 8 characters, understand its core capability and rewrite it once as a shorter semantic summary — never cut off the first 8 characters mechanically. Example: `验证器与评分器设计` → `验证评分`, paired with `titleEn: "Verifier Design"`.
4. **Score leverage (0–100).** For each node, estimate how much of the target it unlocks. The Pareto test: *if the learner only had 3–5 of these, which would carry most of the result?* Those get 80–100.
5. **Wire prerequisites and order.** Put `nodes[]` in the exact first-pass teaching order, then set `deps` so a skill only unlocks after its foundations. Keep the graph shallow; persisted object insertion order is the durable lesson order.
6. **Recommend materials.** On high-leverage nodes, attach 1–3 primary sources as `resources: [{ title, url }]` (official docs, canonical papers, reference repos). Name the material clearly; use absolute HTTP(S) links.
7. **Save.** Call `learn_curriculum` with `{ domain, shortTitle, nodes, previousCourseAction? }`, passing `"pause"` or `"end"` only when it matches the user's explicit answer.

## Quality bar

- 8–20 nodes for a first pass. More is a sign you haven't aggregated.
- The curriculum order must be teachable from start to finish; prerequisites appear before the skills that need them.
- Ids are stable and short (`borrowing`, `lifetimes`) — they're referenced by resources, drills, and attempts.
- Every new node has both Chinese `title` (≤8 characters) and English `titleEn`; put explanations in coaching text, not the title.
- `shortTitle` is a model-authored course summary (≤8 Chinese characters), not a substring of `domain`.
- Prefer one practical lesson reference per skill over a dump; the separate literature phase performs the authoritative deep-reading curation later.

## After saving

Optionally render the tree with `drawio-skill`, then immediately call `learn_lesson` with `action: "next"` and teach the first node. Do not offer review or start literature sourcing yet.
