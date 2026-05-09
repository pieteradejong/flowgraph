# Purpose

## What FlowGraph is

FlowGraph is an interactive, graph-based operational simulator. You build a directed graph of `source`, `processor`, and `sink` nodes connected by capacity-bearing edges, advance the simulation one step at a time, and watch where load accumulates and which links saturate. The point is to make the *behaviour* of a flow system — capacity, bottlenecks, propagation — directly visible and pokeable.

## Why it exists

Operational systems — data centers, distribution networks, supply chains, comms relays — are usually reasoned about with static diagrams (boxes and arrows on a slide) or dense numerical simulations (whose output you have to squint at to interpret). Both extremes lose something. A static diagram doesn't tell you what happens under load. A heavy simulator demands setup effort and interpretation time disproportionate to the question being asked.

FlowGraph aims for the middle ground: enough simulation to see qualitative behaviour (where does it break? what propagates?), with enough interactivity that you can change one capacity, hit Step, and see the consequence in seconds. It's a thinking tool first, a number-crunching tool second.

## Who it's for

- **Engineers reasoning about capacity** of any system that can be drawn as a flow graph: queueing pipelines, request-routing tiers, logistics networks, RF relay chains.
- **People learning** about flow, congestion, and bottlenecks who want to develop intuition by manipulating a model rather than reading about one.
- **The author** — first and primarily. This is a personal tool that should be useful even if no one else ever opens it.

It is explicitly **not** for: production traffic forecasting, capacity planning that drives real procurement decisions, or anything where calibrated quantitative accuracy matters more than fast qualitative insight.

## What success looks like

When FlowGraph is mature, the user can:

1. Pick a prebuilt scenario (data center, satellite network, logistics, etc.) **or** sketch a custom graph in the canvas.
2. Step the simulation and immediately see which edges are healthy / stressed / saturated / overloaded.
3. Adjust source rates, edge capacities, or topology and re-step to see the effect.
4. Run a multi-step scenario, save the run, and replay or compare it against another run.
5. See backpressure, queueing, and failures behave in plausible ways — overloads cascade upstream, queues fill, downed components reroute or block traffic.
6. Read time-series and heatmaps that show *sustained* pressure across many steps, not just the current snapshot.

Phases 1–6 in `docs/ROADMAP.md` map directly to these capabilities.

## Core principles

These are not negotiable in normal development. Lifting one is a deliberate, marked decision.

1. **Simulation is pure and UI-independent.** The domain layer (`src/domain/`) is a set of pure functions over plain data. UI never reaches into simulation logic; simulation never imports React. This is what lets the engine be tested exhaustively, swapped into other contexts (CLI, batch run, eventually a Supabase-backed run store), and reasoned about independently.
2. **Local-first.** No network dependency for the core simulation loop. Persistence (Phase 2, local Supabase) is optional: save/load works only when the stack is up; stepping and editing work offline. Anyone should be able to clone, run `./scripts/init.sh`, and have a working app within a minute.
3. **Visible behaviour over hidden cleverness.** Status bands, edge colors, animated overloads exist because seeing the bottleneck is the entire product. Any modelling change that improves accuracy at the cost of legibility is suspect.
4. **Small, deployable iterations.** `./scripts/test.sh` must always exit 0. Phase boundaries are real; don't half-build features across phases.
5. **Three scripts rule everything.** `init.sh`, `run.sh`, `test.sh` are the contract. If something isn't reachable through those, it doesn't exist.
6. **Strict typing, no premature abstraction.** TypeScript strict mode (incl. `noUncheckedIndexedAccess`). Files under ~200 lines. Patterns introduced only when the second use case appears.

## Non-goals

To keep the scope honest, FlowGraph deliberately is not:

- **A discrete-event simulator.** No event queue, no continuous time. Updates are step-discrete and synchronous.
- **A modelling DSL or graph language.** The data model is intentionally tiny: typed records, no expressions, no formulas in fields.
- **A multi-user collaborative editor.** Local Supabase uses anonymous sessions per browser; the UI remains single-user-at-a-time for any given graph.
- **A monitoring or observability tool.** It does not ingest real telemetry. Inputs are user-authored.
- **A general-purpose graph editor.** Graphs serve the simulator. Features that don't make the simulation more useful (export to GraphML, visual diff, etc.) are out of scope unless explicitly added to the roadmap.

## Relationship to other docs

| Doc | Scope |
|---|---|
| `PURPOSE.md` *(this file)* | Why the project exists, what success looks like, what it deliberately is not. |
| `ROADMAP.md` | Phased plan: what we build and in what order. |
| `ARCHITECTURE.md` | Module boundaries, key invariants, where things go. |
| `CONVENTIONS.md` | Code style and per-language conventions. |
| `PHASE_N_TASKS.md` | Task breakdown by phase (see highest `N` for latest detail). |
| `.cursorrules` | Operating instructions for AI coding assistants working in this repo. |

If two docs disagree, `PURPOSE.md` defines the constraints, `ARCHITECTURE.md` defines the structure, `ROADMAP.md` defines the order, and `PHASE_N_TASKS.md` defines the immediate next steps. Newer wins on tactics; this doc wins on principles.
