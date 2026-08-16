---
name: retrospective
description: Use after a practice session or when the learner notices a recurring pattern, to review progress and adjust the curriculum before the next cycle. Reads learn_status and writes learn_review. Triggered by "how am I doing", "let's review", "what should I change", "retrospective".
---

# Retrospective

Close the loop: turn recent feedback into a concrete adjustment, then hand back to practice.

## Process

1. **Read the state.** Call `learn_status` for average mastery, due count, streak, XP, and the weakest high-leverage skills.
2. **Inspect the pattern.** Look at recent low grades and their notes. Distinguish three causes:
   - **Mis-weighted leverage** — a skill matters more or less than the tree says.
   - **Wrong mastery estimate** — the score doesn't match reality (e.g. a lucky streak).
   - **Missing prerequisite or resource** — practice keeps failing because a foundation or reference is absent.
3. **Decide the adjustment.** Pick the smallest change that fixes the cause:
   - re-weight `leverage` or correct `mastery` via `learn_review` adjustments;
   - or trigger `deconstruct-domain` (add/split a node) / `source-experts` (add a missing resource).
4. **Record it.** Call `learn_review` with a `summary` of the conclusion and any per-node `adjustments`.

## Principles

- One retrospective → one clear next action. Vague reflection doesn't change behavior.
- Prefer adjusting the system (tree, schedule, resources) over telling the learner to "try harder".
- End by pointing back to `practice-coach` so the loop keeps turning.
