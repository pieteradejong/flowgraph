# Phase 1 — Local Simulator: Task Breakdown

**Goal (from `docs/ROADMAP.md`):** an interactive, local-only graph simulator with step-based updates and visible bottlenecks.

**Definition of done:**
- `./scripts/init.sh` succeeds on a fresh clone.
- `./scripts/test.sh` passes (lint, type-check, tests).
- `./scripts/run.sh` starts the dev server and the user can step the simulation, see edge utilization update, and inspect a node.

---

## 1.1 Domain types — DONE
- [x] `src/domain/types.ts`: `NodeKind`, `FlowNode`, `EdgeStatus`, `FlowEdge`, `Graph`.

## 1.2 Simulation step — DONE
- [x] `src/domain/simulation.ts`: `step(graph)`, `statusFor(u)`, `utilization(edge)`.
- [x] Pure: input not mutated.
- [x] Tolerates cycles.

## 1.3 Sample graph — DONE
- [x] `src/domain/sampleGraph.ts`: 5-node DAG that exercises every status band after one step.

## 1.4 Domain tests — DONE
- [x] Vitest set up.
- [x] 23 unit tests, 100% line/function coverage on `simulation.ts`.

## 1.5 Metrics — DONE
- [x] `src/domain/metrics.ts`: `computeMetrics(graph)`.
- [x] Reports throughput, source emission, average/max utilization, status counts, bottleneck edges.
- [x] Tests cover empty, sample, and edge cases.

## 1.6 UI scaffold — TODO
- [ ] Add Vite + React + `@xyflow/react` dependencies.
- [ ] `index.html`, `src/main.tsx`, `src/App.tsx`.
- [ ] Layout: graph canvas (center), inspector (right), metrics panel (bottom), controls (top).

## 1.7 Graph canvas — TODO
- [ ] `src/components/GraphCanvas.tsx`: render the current `Graph` with React Flow.
- [ ] Edge stroke color reflects `EdgeStatus` (healthy/stressed/saturated/overloaded).
- [ ] Node icon/shape reflects `NodeKind` (source/processor/sink).

## 1.8 Inspector — TODO
- [ ] `src/components/Inspector.tsx`: shows the selected node or edge with all its fields.

## 1.9 Metrics panel — TODO
- [ ] `src/components/MetricsPanel.tsx`: renders `computeMetrics(graph)` output.

## 1.10 Controls — TODO
- [ ] `src/components/Controls.tsx`: buttons for `step`, `reset`, `randomize`.

## 1.11 CI — DONE
- [x] GitHub Actions workflow runs `./scripts/test.sh` on push and PR.

---

## Verification checklist

Before declaring Phase 1 complete:

- [x] `./scripts/test.sh` exits 0.
- [x] `./scripts/run.sh` starts the dev server with no console errors.
- [x] Loading the app shows `sampleGraph` with one healthy, one stressed, two saturated, one overloaded edge after one click of "Step".
- [x] Clicking a node or edge populates the inspector.
- [x] Metrics panel updates after each step.
- [ ] Clicking "Reset" returns all edge loads to 0. *(not yet eyeballed)*
