---
name: source-experts
description: Use to find the strongest practitioners in a domain and collect their primary material (open source, docs, papers, talks), then attach it to skill nodes with learn_add_resource. Triggered by "who are the best people at X", "find the best resources for Y", "what should I read for Z".
---

# Source the Best Experts

Learn from the people who actually set the standard, and tie their material to the skills it teaches.

## Process

1. **Identify the strongest people/orgs.** Use `web_search` for authoritative signals: widely-adopted open source, canonical papers, maintainers, standards authors. Prefer primary sources over aggregators and tutorials.
2. **Collect primary material.** For each expert, find the highest-signal artifact: a reference implementation repo, the original paper, official docs, or a definitive talk.
3. **Summarize why it matters.** One paragraph: what this teaches and when to reach for it. Keep it concrete.
4. **Link to skills.** Map each resource to the `nodeIds` it trains (from the curriculum). **At least one node is required** — materials hang on skills as `{ title, url }` recommendations. A resource can cover several nodes.
5. **Save.** Call `learn_add_resource` per resource with `{ author, title, url, type, summary, nodeIds }`.

## Quality bar

- Favor **fewer, canonical** sources over a long link dump. One great repo beats ten blog posts.
- Every resource links to at least one skill node, so practice can cite name + URL.
- For programming domains, prefer real codebases the learner can read and run.

## After sourcing

Return to `practice-coach`: the practice tool surfaces each skill's recommended materials (title — link) as references for the drill.
