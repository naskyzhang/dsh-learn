---
name: source-experts
description: Use during the literature phase after every first-pass lesson is complete. Curates the fixed 3 canonical + 2 recent-hot reading slate and 3 authoritative people, then saves it with learn_literature.
---

# Source the Best Experts

Build a small, auditable literature slate from the people and primary works that set the standard.

## Process

1. **Confirm the phase.** Call `learn_status`. Run this workflow only when the course phase is `literature`; never interrupt the ordered first learning pass.
2. **Find 3 canonical readings.** Use current web search and primary-source verification to choose exactly three field-defining articles, papers, or technical blogs. For each, capture title, author, type, URL, and a concrete reason it is authoritative.
3. **Find 2 recent high-heat readings.** Choose exactly two high-signal works published within the past 12 months. Record `publishedAt` (`YYYY-MM-DD`) and specific `heatEvidence` such as citation growth, adoption, repository activity, standards impact, or sustained expert discussion. Do not equate search rank with heat.
4. **Find 3 authoritative people.** Use evidence such as foundational papers, standards authorship, canonical systems, or durable field impact. For each person, select one most important primary interview, article, talk, or essay and summarize its central `keyViewpoint`.
5. **Verify.** Open every URL, reject duplicate links, secondary listicles, inaccessible claims, and fabricated publication dates. Prefer original publisher, author, conference, journal, or project pages.
6. **Save once.** Call `learn_literature` with `action: "recommend"` and the exact `authoritative`, `trending`, and `experts` arrays.
7. **Guide the reading.** Present a sensible reading order and discuss each source with the learner. Call `learn_literature` with `action: "complete", confirmed: true` only after the learner explicitly indicates that the phase is finished.

## Quality bar

- The quota is exact: **3 canonical readings + 2 recent-hot readings + 3 people**.
- Every claim of authority or heat needs observable evidence; popularity alone is insufficient.
- A person's artifact must be their own interview/article/talk/essay, not a profile written by someone else.
- Distinguish a source's argument from your interpretation in `keyViewpoint`.

## After sourcing

After the learner finishes and `learn_literature` action `"complete"` succeeds, hand off to `practice-coach`. The first review pass starts from the first curriculum node.
