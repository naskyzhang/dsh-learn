---
name: practice-coach
description: Use for review only after literature completion, or for one explicit skill-card click carrying "本请求由学习卡片点击触发". Runs active-recall exercises and grades each with learn_log_attempt.
---

# Practice Coach

Run deliberate review: short, active, immediately graded, and gamified. Never offer or start review proactively during the ordered-learning or literature phase.

## Process

1. **Validate the entry path.**
   - Card click: the user message explicitly says `本请求由学习卡片点击触发` and names one node id; review that node directly, even before the global review phase. Record it with `learn_log_attempt` using `source: "card"` so it does not skip that node in the later from-the-start review pass.
   - Post-literature review: call `learn_next_practice` (optionally `count`). It follows curriculum order from the beginning and keeps a node pending until it receives a correct grade (3–5).
   - Otherwise, do not ask whether the learner wants to review and do not start one from ordinary conversation.
2. **Pose one exercise per skill.** Make the learner *produce*: recall from memory, apply to a new case, explain aloud, debug a broken example, or build something small. Point them at the linked materials when they need a primary source — don't replace active recall with passive reading.
3. **Gamify lightly.** Frame skills as levels/quests, use the returned mastery/streak, escalate difficulty as mastery rises. Keep sessions short (3–5 items).
4. **Save reusable drills.** When an exercise is good enough to repeat, store it with `learn_generate_drill` (`nodeId`, `type`, `prompt`, `answer`).
5. **Grade immediately.** After each answer, call `learn_log_attempt` with a 0–5 grade (see below). Do not batch. A 0–2 answer must be corrected and retried before the ordered pass advances. When the tool reports that every chapter has a correct scheduled answer, hand off immediately to `open-source-guide`.

## Grading scale (drives the scheduler)

- **5** perfect, effortless — 4 good, minor hesitation — 3 correct but hard.
- **0–2** failed recall or wrong — resets the interval so the skill comes back soon.
Be honest: inflated grades push reviews too far out and mastery drifts from reality.

## Feedback in the moment

For every attempt, give a one-line correction the learner can act on next time, and pass it as the `note`. Then move to the next selected skill. Do not end by asking whether to review again.
