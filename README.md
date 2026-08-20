# dsh-learn

[English](README.md) | [中文](README.zh-CN.md)

[![topic](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that turns “learn a domain” into a durable staged journey:

1. **Skill deconstruction** — build a Pareto skill tree and mark the ~20% of nodes that unlock ~80% of outcomes
2. **Ordered learning** — complete the whole curriculum in sequence without unsolicited review prompts
3. **Literature reading** — after the lessons, read 3 canonical works, 2 high-heat works from the past year, and the key primary ideas of 3 authoritative people
4. **Correct review from the beginning** — retry each chapter until correct before advancing
5. **Open-source blueprint** — compare 2–3 exemplary implementations and map exactly what to borrow for a zero-to-one build

The stack stays small: one learning kernel, durable phase state, model-facing tools, and stage skills. Design and data model: [`docs/DESIGN.md`](docs/DESIGN.md).

## Status

- **Ready**: ordered learning → literature → correct-answer review → open-source blueprint through `learn_*` tools, six stage skills, JSON storage, and SM-2 grading.
- **Ready**: no separate web app; `dsh.client` adds a draggable pixel cat and five-stage knowledge plant via `shell.overlay`. Expanding the companion shows the curriculum as an adaptive-height skill-tree card, including mastery and recommended links; clicking a skill node starts its review in the current conversation. See [`docs/UI-INTEGRATION.md`](docs/UI-INTEGRATION.md).
- **Note**: written against DSH pre-release APIs (`0.1.0-rc`); verify with the checklist below after install.

## Install

Requires a working `dsh`. From a local checkout into the `web` profile:

```sh
dsh plugin --profile web add ./dsh-learn
```

Or after publish, from npm / GitHub:

```sh
dsh plugin --profile web add dsh-learn
# or
dsh plugin --profile web add github:naskyzhang/dsh-learn
```

Confirm the plugin line is present:

```sh
dsh --profile web --dump-config   # should include id: learn / name: dsh-learn
```

Skills under `skills/` need to be on the DSH skill loader path (for example workspace `.dsh/skills/`, or symlink this repo’s `skills/*` there).

## Usage

After install, say what you want to learn; the orchestrator advances the durable course phases:

> Help me learn Rust ownership.

A typical course journey:

1. `learn_course list` — inspect courses; before switching an unfinished course, choose pause or end
2. `learn_curriculum` — first write a semantic card summary in `shortTitle` (≤8 Chinese characters), then generate and save the bilingual skill tree (optionally render with [drawio-skill](https://github.com/Agents365-ai/drawio-skill))
3. `learn_lesson next/complete` — teach every node in curriculum order; ordinary conversation never proactively starts review
4. `learn_literature recommend` — after all lessons, save 3 canonical + 2 recent-hot readings and 3 authoritative people with one primary artifact and key viewpoint each
5. `learn_literature complete` (`confirmed: true`) — enter review only after the learner explicitly finishes the reading phase
6. `learn_next_practice` → quiz → `learn_log_attempt` (score 0–5) — start at node one; grades 3–5 advance to the next chapter
7. `learn_open_source` — after every chapter is correct, compare 2–3 projects and save a concrete zero-to-one borrowing plan
8. `learn_review` — retrospect and adjust the tree only when explicitly requested
9. `learn_status` anytime for phase, progress, streak, and weak spots

Only one course can be active at a time. Pause keeps all progress (`learn_course resume` later); end permanently deletes the course JSON.

Each skill node may carry recommended materials as `{ title, url }` — set them in `nodes[].resources` or later via `learn_add_resource`. Before literature completion, clicking a skill in the companion card is the only explicit review entry; after every ordered review answer is correct, the journey automatically enters its open-source capstone.

## Config

`learn` block in `cordis.patch.yml`:

| Key | Default | Description |
|-----|---------|-------------|
| `storeDir` | `''` | Learning state directory; empty → `$DSH_HOME/dsh-learn` (or `~/.dsh-learn` if unset) |
| `newSkillsPerDay` | `3` | Default number of skills returned per review session |
| `dailyReviewLimit` | `20` | Max items returned by one `learn_next_practice` |

## Storage consistency & validation

- Mutations run as serialized read → modify → atomic write transactions; a store-wide lifecycle lock coordinates processes sharing `storeDir` and enforces a single active course.
- Each write uses a temp file and atomic rename; failed transactions leave no partial state and do not block later ones.
- Curricula reject duplicate nodes, dangling parents/deps, self-refs, parent cycles, and dependency cycles; node IDs are 1–64 lowercase letters, digits, `_`, or `-`.
- Scores are integers 0–5; mastery/leverage are integers 0–100; resources, drills, and review edits must reference existing nodes.

Run tests and the client bundle:

```sh
npm install
npm test
npm run typecheck:client
npm run bundle
```

## Layout

```
dsh-learn/
├── package.json          # dsh.bundle declaration
├── cordis.patch.yml      # inserts the learn plugin line
├── src/
│   ├── index.js          # plugin entry: name/inject/Config/apply, tools
│   ├── bridge.js         # Host Connection RPC: companion long-poll snapshots
│   ├── client/           # shell overlay, pixel cat/plant, browser controller
│   ├── store.js          # JSON store + SM-2 + data model
│   └── tools.js          # eleven learn_* tools
├── lib/client.js         # browser bundle for the DSH Client loader
├── skills/               # orchestrator + five stage skills (SKILL.md)
├── tests/                # concurrency, graph, and tool boundary tests
└── docs/
    ├── DESIGN.md         # architecture / data model / scheduling
    └── UI-INTEGRATION.md # in-page cat & knowledge plant integration
```

## Checklist (first install on real DSH)

- [ ] `defineTool` imports from `@deepseek-ai/dsh-tools`; tools show up in the system tool catalog
- [ ] `learn_curriculum` writes `<storeDir>/<domain>.json`
- [ ] Switching an unfinished course requires pause/end; end deletes the JSON file
- [ ] After `learn_next_practice` → `learn_log_attempt`, `dueAt` / `mastery` / `xp` update correctly
- [ ] `output.render` text echoes back to the model
- [ ] Web boot list includes `/plugins/dsh-learn/client.js`; page shows the draggable cat and plant
- [ ] After `learn_log_attempt`, plant progress and cat reward animation update
- [ ] Dependency versions (`@deepseek-ai/dsh-tools`, `@deepseek-ai/schemastery`) match your DSH

## Companion design: orange cat & knowledge plant

The learning companion is a small retro-pixel overlay on the DSH page (`shell.overlay`), not a separate app. It is a read-only projection of `LearnStore` progress. Details: [`docs/UI-INTEGRATION.md`](docs/UI-INTEGRATION.md).

### Visual language

| Element | Palette / look |
|---------|----------------|
| Orange cat | Fur `#efa24c` / light `#ffd791` / shadow `#c76b3e`, pink ears & blush `#f68a91` |
| Leaves | Three greens `#8ed76b` / `#58ad5b` / `#2f7650` |
| Pot | Soft purple `#a79ae8` with rim `#d5c9ff`, smile face and blush |
| Bloom | Petal pinks `#ffd2df` / `#ff9fbd`, gold center `#ffd466` |

All sprites use crisp pixel edges (`image-rendering: pixelated`) and a shared outline `#523747`.

### Orange cat

- Default: sleeps facing the plant with floating `ZZZ`; never walks on its own.
- Expand (click): short adventure — look around → walk right → walk left → climb → jump back → stand and meow `Miao~` → sleep again (~14s).
- Collapse: stay prone, look around, then meow with round mouth, tongue, blush, and gray cute `Miao~` text (~3.6s).
- On XP gain: a brief tail wag. On plant level-up: the same look-around → meow celebration.
- Drag the scene to move; position is remembered in `localStorage` (coordinates only, never XP or stage).

### Knowledge plant (five stages)

Growth follows `profile.level` / `levelProgress` from the same store — no second scoreboard:

| Stage | Name | Look |
|------:|------|------|
| 1 | Seed | Tiny brown seed in the pot |
| 2 | Sprout | Short stem + one leaf |
| 3 | Foliage | Stem + left & right leaves |
| 4 | Bud | Full leaves + pink heart bud |
| 5 | Bloom | Four teardrop petals around a gold center |

Within a stage, plant height eases from ~94% to 100% with XP progress. Ordinary XP plays a short grow bounce; each **level-up** plays a victory sequence (aura, sparkles, leaf cheer, petal bloom) together with the cat’s meow.

### What it intentionally is not

No audio, no constant bouncing, no red urgency alerts. With `prefers-reduced-motion`, walking and celebration animations collapse to a brief pose change.

## License

MIT
