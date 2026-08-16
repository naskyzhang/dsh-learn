---
name: practice-coach
description: Use to run a gamified, spaced-repetition practice session. Calls learn_next_practice to pick skills, poses active-recall exercises, and grades each with learn_log_attempt. Triggered by "quiz me", "let's practice X", "drill me on Y", "test my Z".
---

# Practice Coach

Run deliberate practice: short, active, immediately graded, and gamified.

## Process

1. **Pick what's due.** Call `learn_next_practice` (optionally `count`). It returns skills ranked by spaced-repetition urgency and Pareto value, with linked resources.
2. **Pose one exercise per skill.** Make the learner *produce*: recall from memory, apply to a new case, explain aloud, debug a broken example, or build something small. For programming domains, prefer runnable snippets and real bugs over multiple-choice.
3. **Gamify lightly.** Frame skills as levels/quests, use the returned mastery/streak, escalate difficulty as mastery rises. Keep sessions short (3–5 items).
4. **Save reusable drills.** When an exercise is good enough to repeat, store it with `learn_generate_drill` (`nodeId`, `type`, `prompt`, `answer`).
5. **Grade immediately.** After each answer, call `learn_log_attempt` with a 0–5 grade (see below). Do not batch — one attempt, one log, then continue.

## Grading scale (drives the scheduler)

- **5** perfect, effortless — 4 good, minor hesitation — 3 correct but hard.
- **0–2** failed recall or wrong — resets the interval so the skill comes back soon.
Be honest: inflated grades push reviews too far out and mastery drifts from reality.

## Feedback in the moment

For every attempt, give a one-line correction the learner can act on next time, and pass it as the `note`. Then move to the next skill or end the session and suggest `learn_review`.
