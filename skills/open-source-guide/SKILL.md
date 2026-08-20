---
name: open-source-guide
description: Use in the final capstone phase after every curriculum node has a correct scheduled review answer. Compares 2-3 exemplary open-source systems and saves a concrete zero-to-one borrowing blueprint with learn_open_source.
---

# Open-Source Guide

Turn completed learning into an implementable system design. Study open source for transferable architecture, not for blind copying.

## Process

1. **Confirm the gate.** Call `learn_status`; continue only when phase is `capstone`. Card-triggered attempts do not satisfy this gate.
2. **Research 2–3 exemplary projects.** Use current web search and primary repository pages. Prefer projects with influential architecture, readable implementation, meaningful adoption, an identifiable license, and direct relevance to the learner's target.
3. **Inspect implementation.** Read architecture docs and representative source paths. Explain how each project handles the same core concerns so the comparison is like-for-like rather than a feature list.
4. **Compare trade-offs.** For every project record:
   - why it is worth learning;
   - architecture and key implementation choices;
   - concrete strengths and weaknesses;
   - the exact modules, patterns, or subsystems worth borrowing;
   - how those parts must be adapted for a new system.
5. **Build the 0→1 blueprint.** Choose one project as the best overall foundation, explain why, then write 3–12 ordered construction steps. Every step names which project's specific part to borrow and the concrete implementation action.
6. **Save and present.** Call `learn_open_source` once with `projects` and `blueprint`, then present its comparison and construction plan to the learner.

## Quality bar

- Repository URLs are verified primary links; reject showcases, wrappers, tutorials, and abandoned mirrors.
- Compare implementation, not GitHub stars. Cite architectural evidence from code or official design docs.
- Include real disadvantages and adoption costs; no project is “best” on every dimension.
- Respect licenses and concepts separately: borrowing a pattern is not permission to copy incompatible code.
- “Borrow this part” must name a concrete subsystem or pattern, not vague advice such as “learn its architecture.”
