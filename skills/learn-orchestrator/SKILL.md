---
name: learn-orchestrator
description: Use when the user wants to learn, study, master, or get better at a domain, skill, or topic ("help me learn X", "I want to get good at Y", "teach me Z"). Drives the four-phase learning loop — deconstruct, source, practice, feedback — using the dsh-learn tools. Route to the phase-specific skills for detail.
---

# Learn Orchestrator

Run learning as a closed loop, not a lecture. The methodology has four phases; each maps to a phase skill and to `learn_*` tools.

## The loop

1. **Deconstruct** (`deconstruct-domain` skill) — summarize the course for the card (`shortTitle`, ≤8 Chinese characters), break it into a bilingual skill tree, and rank each node by Pareto leverage. Save with `learn_curriculum`.
2. **Source** (`source-experts` skill) — find the strongest people in the field and their primary material. Save with `learn_add_resource` onto specific skill nodes (`nodeIds` required).
3. **Practice** (`practice-coach` skill) — call `learn_next_practice`, pose a gamified exercise per skill, save reusable ones with `learn_generate_drill`.
4. **Feedback + retrospective** (`retrospective` skill) — grade each attempt immediately with `learn_log_attempt`; periodically call `learn_review` to re-weight the tree, then loop back to practice.

## How to drive it

- On a new domain: call `learn_course` with `action: "list"` before phase 1. If a different unfinished course is active, **ask the user** whether to pause it or end it. Never infer the choice.
- A pause keeps the previous course and all progress in the library. An end permanently deletes its JSON file. Pass the explicit answer as `previousCourseAction` to `learn_curriculum`.
- To return to paused work, call `learn_course` with `action: "resume"`. If that displaces unfinished active work, ask the same pause/end question first.
- Only call `learn_course` with `action: "end"` and `confirmed: true` after explicit user confirmation.
- After lifecycle handling, run phase 1, then offer phase 2, then start phase 3. Don't front-load everything — get to practice fast.
- On a returning learner: open with `learn_status`, then go straight to `learn_next_practice`.
- Keep feedback tight: one attempt → one `learn_log_attempt` → next. Small batches beat long quizzes.
- After a session or when the user notices a pattern, run `learn_review` and adjust before the next cycle.
- To visualize the skill tree or a concept map, use the `drawio-skill` (or a Mermaid code fence) on the nodes returned by `learn_status`.

## Principles

- **20% for 80%**: always practice the highest `leverage × (100 − mastery)` skills first; the tools already rank this way.
- **Active recall over rereading**: drills must make the learner produce, apply, or debug — never just recognize.
- **Respect prerequisites**: the scheduler holds back a skill whose dependencies are still weak; trust that order.
