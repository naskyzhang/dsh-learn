# dsh-learn Web dashboard (milestone 3 — not yet built)

The chat-driven learning loop (tools + skills) works today without any UI. This
folder holds the design and data contract for the optional **Web dashboard** that
turns the same JSON store into a visual "learning cockpit" inside DSH Web.

Status: **scaffold only.** No client bundle is shipped yet, on purpose — a DSH
Web client plugin needs the client SDK, a host HTTP route, and a build step, and
should be added only once the core loop is validated against your DSH version.

## What it will show

- **Skill-tree map** — the curriculum as an interactive tree/graph, each node
  colored by `mastery` and sized by `leverage`; a node is a "level" you can open.
- **Practice deck** — the `learn_next_practice` queue as flippable cards; grade
  with one click, which calls `learn_log_attempt`.
- **Progress panel** — XP, level, streak, due-today count, and a mastery trend.
- **Resource shelf** — the sourced experts/material grouped by skill node.

## How it will plug into DSH

Mirrors the `dsh-diagram` shape: a `dsh.bundle` + `dsh.client` plugin that

1. injects `webServer` on the host and mounts read/write HTTP routes over the
   same `LearnStore` used by the tools (single source of truth — the UI and the
   agent never disagree);
2. serves a self-contained client that renders the panels above and calls those
   routes;
3. reuses the official DSH design tokens so it matches the native UI.

## Data contract (already stable)

Every domain is one JSON file at `<storeDir>/<domain-id>.json` (see
[`../docs/DESIGN.md`](../docs/DESIGN.md#data-model)). The dashboard reads exactly
this document — the same one the tools write — so the UI is a pure projection.
No new persistence is introduced by the UI layer.

## Build order when we implement it

1. Host route package exposing `GET /learn/:domain` and `POST /learn/:domain/attempt` over `LearnStore`.
2. Client plugin (`dsh.client`) rendering the four panels from that route.
3. Wire the skill-tree map through the installed `drawio-skill` export or a
   client-side graph renderer.
