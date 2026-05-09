# Architecture

Clone and run overview: [README.md](../README.md). Phasing: [ROADMAP.md](ROADMAP.md).

## Core principle

The simulation engine is pure and UI-independent. The persistence layer is
isolated from the domain.

## Layers

```
UI (React)              src/components/, src/App.tsx
       │
       ├── Domain        src/domain/   (pure functions; no I/O)
       │
       └── Persistence   src/persistence/  (Supabase client + graph CRUD)
```

### Layer rules

- `src/domain/*` MUST NOT import from `src/persistence/*` or any UI module.
- `src/persistence/*` imports domain types but never the simulation runtime.
- `src/App.tsx` is the only place that wires UI ↔ persistence ↔ domain.

## Domain modules

- `types.ts` — `FlowNode`, `FlowEdge`, `Graph`, `EdgeStatus`.
- `simulation.ts` — `step(graph): Graph`, `runForSteps`, `inflightOn`, `isDown`.
- `metrics.ts` — `computeMetrics(graph)` (sourceEmission, sinkThroughput, status counts, bottlenecks).
- `scenarios/` — prebuilt graph topologies.
- `graphMutations.ts` — pure CRUD on `Graph` (used by the editor).
- `randomize.ts` — pure rate randomizer.

## Persistence layer

Local-only Supabase via the Supabase CLI. Postgres + GoTrue + PostgREST run
in Docker; the API URL/port come from `supabase/config.toml` (`[api].port`, **55321** in-repo by default). Hosted Supabase is intentionally out of
scope; the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars are local-
stack values only.

### Modules

- `client.ts` — singleton Supabase client; lazy-bootstraps anonymous auth.
  Returns `null` when env vars are missing so the UI can show an offline
  banner instead of crashing.
- `serialize.ts` — `toPersisted(graph)` strips runtime state
  (`load`, `pipeline`, `status`, `downForSteps`); `fromPersisted(json)`
  rehydrates with idle defaults. The persisted shape carries
  `schemaVersion: 1` for forward-compatibility.
- `graphs.ts` — `listGraphs`, `createGraph`, `renameGraph`, `deleteGraph`,
  `listVersions`, `loadVersion`, `saveSnapshot`. All errors wrapped as
  `PersistenceError`.

### Schema

Two tables (see `supabase/migrations/0001_init.sql`):

- `graphs(id, user_id, name, created_at, updated_at)` — one per named graph.
- `graph_versions(id, graph_id, version, data jsonb, message, created_at)`
  — immutable snapshot history with `unique(graph_id, version)`.

RLS policies restrict each row to its `auth.uid()` owner. Anonymous auth
gives every browser session a real `auth.users` row, so the same RLS
policies that work for hosted multi-user deployments also work locally.

### Persistence scope

Only topology is persisted. Runtime state is reset on load. Saving
mid-simulation is out of scope for Phase 2; the `data` column is plain
`jsonb`, so widening the serializer later requires no migration.

### Auth model

Anonymous auth: `supabase.auth.signInAnonymously()` runs on first load and
the session is persisted to `localStorage` by `@supabase/supabase-js`.
Same browser = same `user_id`; clearing site data or switching browser =
different user = previous saves invisible. Acceptable for solo local use.

## Key invariants

- Graph is directed.
- No mutation inside simulation functions; `step()` returns a new `Graph`.
- All state transitions are explicit.
- Domain code is environment-agnostic (no `import.meta.env`, no DOM, no
  Supabase). It can run in a Node test runner with no setup.
