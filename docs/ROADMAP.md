# FlowGraph Roadmap

## Phase 1 — Local Simulator (complete)
- [x] Simulation step engine
- [x] Edge utilization visualization
- [x] Metrics panel
- [x] Sample graph
- [x] Graph editor (Tier 1: add / connect / edit / delete via Inspector)

## Phase 2 — Persistence (local Supabase) (complete)
- [x] Local Supabase stack via the CLI (Docker; API URL/port in `supabase/config.toml`, default **55321** in-repo to avoid clashing with another local Supabase on **54321**); hosted is out of scope
- [x] Schema: `graphs` + `graph_versions` with RLS, immutable snapshot history
- [x] Anonymous auth (browser-bound; trivial upgrade to email/password later)
- [x] Persistence layer (`src/persistence/`): client, serializer, graph CRUD, mocked-client tests
- [x] UI: Save / Open library / Version history sidebar; offline banner when stack is down
- [x] Topology-only persistence; runtime state reset on load (`data` column is `jsonb`, so resume-mid-simulation is a serializer-only change later)

## Phase 3 — Simulation Runs
- Store run results
- Replay runs
- Compare runs

> Depends on Phase 2 (runs need persistence).

## Phase 4 — Scenarios (complete)
- [x] Prebuilt graph templates:
  - [x] data center (web tier → app tier → db/cache)
  - [x] satellite network (ground → constellation → ground)
  - [x] logistics system (manufacturers → distribution → retail)
- [x] Scenario picker in the UI

> Pure domain work — no persistence required. Independent of Phase 2/3.

## Phase 5 — Advanced Simulation (complete)
- [x] Latency propagation — flow takes `latency` steps to traverse via per-edge pipelines
- [x] Backpressure — `load` capped at `capacity`; `status` from desired demand so `overloaded` still surfaces (Model A: lossy, no upstream cascade)
- [x] Queueing — optional `bufferSize` caps total in-flight flow (`sum(pipeline)`)
- [x] Failures — `downForSteps` on nodes & edges, ticks down per step; UI Fail/Recover buttons; new `down` edge status

> The substantive simulator upgrade. Multi-pass true backpressure (conservation cascade) deferred.

## Phase 6 — Visualization
- Time-series charts (utilization / throughput per step)
- Heatmaps (sustained pressure across many steps)
- Bottleneck highlighting (animated emphasis on persistent overloads)

> Depends on Phase 5 producing richer per-step state worth charting.

---

## Cross-cutting work (not phase-bound)

These are quality / hygiene items that apply across phases. Pull them in opportunistically.

- **Graph editor Tier 2** — drag nodes to reposition; persist positions in graph; replace BFS auto-layout with manual placement.
- **True backpressure** — multi-pass / fixed-point so dropped flow propagates back to sources (mass conservation).
- **UI tests** — `@testing-library/react` + `jsdom`; smoke tests for App, Controls, Inspector, MetricsPanel. Domain has 100% coverage; UI has 0%.
- **Lint + format** — ESLint (typescript-eslint, react, react-hooks) and Prettier; wire `lint` and `format` scripts. `./scripts/test.sh` already warns these are missing.
- **README** — `docs/README.md` still describes the generic project template, not FlowGraph. Anyone landing on the GitHub repo sees the wrong project.
- **Pre-commit hook** — `simple-git-hooks` + `lint-staged` running `vitest related --run` and the linter on changed files.
- **Property-based tests** — `fast-check` for `step` invariants (no NaN/Infinity, determinism, mass conservation on linear chains). Catches a class of bugs example-based tests never will, especially as `step` grows in Phase 5.
