---
name: learn-orchestrator
description: Use when the user wants to learn, study, master, or get better at a domain, skill, or topic ("help me learn X", "I want to get good at Y", "teach me Z"). Drives the durable course journey — deconstruct, ordered learning, literature reading, correct-answer review, then an open-source blueprint.
---

# Learn Orchestrator

Run learning as a durable staged journey, not an opportunistic quiz loop. The learner completes every lesson in order, reads the field's essential literature, answers a from-the-start review correctly, then studies exemplary open-source implementations.

## The loop

1. **Deconstruct** (`deconstruct-domain` skill) — summarize the course for the card (`shortTitle`, ≤8 Chinese characters), break it into a bilingual skill tree, and save it with `learn_curriculum`.
2. **Ordered learning** — call `learn_lesson` with `action: "next"`, teach that node, check understanding, then call `action: "complete"`. Continue directly until every node is complete. Do not ask whether the learner wants to review and do not call `learn_next_practice` in this phase.
3. **Literature reading** (`source-experts` skill) — after the final lesson, research and save exactly 3 canonical readings, 2 high-heat readings from the past year, and 3 authoritative people with one key primary artifact and viewpoint each via `learn_literature`. Guide the learner through the slate; call `action: "complete", confirmed: true` only after the learner says reading is finished.
4. **Correct-answer review** (`practice-coach` and `retrospective` skills) — literature completion starts review from the first curriculum node. A grade of 3–5 is correct; a wrong answer keeps that node pending. Only scheduled attempts count toward phase completion.
5. **Open-source blueprint** (`open-source-guide` skill) — once every node has a correct scheduled review answer, compare 2–3 exemplary open-source systems and save their implementation trade-offs plus a zero-to-one borrowing plan with `learn_open_source`.

## How to drive it

- On a new domain: call `learn_course` with `action: "list"` before phase 1. If a different unfinished course is active, **ask the user** whether to pause it or end it. Never infer the choice.
- A pause keeps the previous course and all progress in the library. An end permanently deletes its JSON file. Pass the explicit answer as `previousCourseAction` to `learn_curriculum`.
- To return to paused work, call `learn_course` with `action: "resume"`. If that displaces unfinished active work, ask the same pause/end question first.
- Only call `learn_course` with `action: "end"` and `confirmed: true` after explicit user confirmation.
- After lifecycle handling and curriculum creation, call `learn_lesson` with `action: "next"` and start teaching immediately.
- On a returning learner, open with `learn_status` and route by phase: `learning` → `learn_lesson`; `literature` → saved reading slate; `review` → `learn_next_practice`; `capstone` → `open-source-guide`; `completed` → present the saved completion state.
- Never ask in ordinary conversation whether the learner wants a review and never proactively start one during `learning` or `literature`.
- Before literature is complete, a review starts only from the explicit card-click message: `本请求由学习卡片点击触发`. Review that requested node without changing the ordered-learning phase.
- After `learn_literature` action `"complete"`, begin the first full review pass from the first node without asking again.
- Keep review feedback tight: one attempt → one `learn_log_attempt` → next. A 0–2 answer must be corrected before advancing; after the final correct answer, start `open-source-guide`.
- Run `learn_review` only when the learner explicitly requests a retrospective or a recurring problem requires a curriculum correction; never offer it as a routine session ending.
- To visualize the skill tree or a concept map, use the `drawio-skill` (or a Mermaid code fence) on the nodes returned by `learn_status`.

## Principles

- **Sequence and correctness before completion**: the first learning pass follows curriculum order; post-literature review also starts at node one and cannot advance past an incorrect answer.
- **Active recall over rereading**: drills must make the learner produce, apply, or debug — never just recognize.
- **Respect prerequisites**: the scheduler holds back a skill whose dependencies are still weak; trust that order.
