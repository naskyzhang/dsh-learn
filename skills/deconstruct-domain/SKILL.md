---
name: deconstruct-domain
description: Use at the start of learning a new domain, or when a curriculum needs rebuilding. Deconstructs a domain into a Pareto-ranked skill tree and saves it with learn_curriculum. Triggered by "break down X", "what should I learn first in Y", "make me a curriculum for Z".
---

# Deconstruct a Domain

Turn a fuzzy domain into a small, ordered skill tree where the highest-leverage 20% is explicit.

## Process

1. **Define the target.** Ask what success looks like concretely (a task they want to do, not "know everything"). A sharp target shrinks the tree.
2. **List candidate sub-skills.** Brainstorm 10–25 elements, then aggregate near-duplicates. Prefer skills phrased as capabilities ("trace a borrow-check error"), not topics ("ownership").
3. **Score leverage (0–100).** For each node, estimate how much of the target it unlocks. The Pareto test: *if the learner only had 3–5 of these, which would carry most of the result?* Those get 80–100.
4. **Wire prerequisites.** Set `deps` so a skill only unlocks after its foundations. Keep the graph shallow — deep chains stall practice.
5. **Save.** Call `learn_curriculum` with `{ domain, nodes: [{ id, title, leverage, deps?, parent? }] }`.

## Quality bar

- 8–20 nodes for a first pass. More is a sign you haven't aggregated.
- The three highest-leverage nodes should be practiceable **today** (few or no deps).
- Ids are stable and short (`borrowing`, `lifetimes`) — they're referenced by resources, drills, and attempts.

## After saving

Offer to render the tree with the `drawio-skill`, then move to `source-experts` or straight to `practice-coach`.
