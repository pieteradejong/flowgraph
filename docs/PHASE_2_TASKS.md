# Phase 2 — Local Supabase Persistence

Status: verified (local stack + migrations + persistence smoke script).

## Setup tasks

- [x] `supabase init`; commit `supabase/config.toml`; supabase-managed `.gitignore`
- [x] `.env.example` with local-stack defaults
- [x] `scripts/db.sh` — `start | stop | status | reset | migrate | sync-env`
- [x] `supabase/migrations/0001_init.sql` — `graphs`, `graph_versions`, RLS, indexes
- [x] `@supabase/supabase-js` added as a runtime dep

## Persistence layer (`src/persistence/`)

- [x] `client.ts` — singleton client, lazy anonymous auth, `null` when env vars missing
- [x] `serialize.ts` — `toPersisted` / `fromPersisted`, drops runtime state
- [x] `graphs.ts` — `listGraphs`, `createGraph`, `renameGraph`, `deleteGraph`, `listVersions`, `loadVersion`, `saveSnapshot`
- [x] `serialize.test.ts` — round-trip + runtime reset
- [x] `graphs.test.ts` — mocked-client unit tests for every CRUD path

## UI

- [x] `Controls` — Save + Open/Save-as buttons, persistence-availability gating, current-graph name display
- [x] `GraphLibrary` modal — list, open, rename, delete, save-as-new
- [x] `VersionHistory` sidebar — versions list with Restore
- [x] App-level state: `currentGraphId`, library/versions queries, error surfaces
- [x] "Local Supabase not running" banner

## Docs

- [x] `.cursorrules` — lifted Supabase restriction; documented persistence boundary
- [x] `docs/ARCHITECTURE.md` — added persistence layer + auth model + invariants
- [x] `docs/ROADMAP.md` — Phase 2 marked complete
- [x] `docs/PHASE_2_TASKS.md` — this file

## Verification

- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean
- [x] `npx vitest run` — 106 / 106 green (was 93)
- [x] Manual smoke once Docker is running:
  - [x] `./scripts/db.sh start` brings up the stack and writes `.env.local` (uses `supabase status -o env` for `API_URL` / `ANON_KEY`)
  - [x] `./scripts/db.sh reset` applies the migration cleanly
  - [x] Create graph → 3 snapshots → restore v1 → delete graph — exercised via `node scripts/smoke-phase2.mjs` (same flows as the UI against PostgREST + RLS)
  - [x] Verify RLS: second anonymous session cannot list the first session’s graphs — same script (equivalent to a private/incognito window)

Repeatable check (requires Docker + `./scripts/db.sh start`): `npm run smoke:phase2` or `node scripts/smoke-phase2.mjs`.

Local API port is `[api].port` in [`supabase/config.toml`](../supabase/config.toml) (defaults to **55321** in-repo so another Supabase stack can keep **54321**). Database bind port follows `[db].port` (**55322**). Inspect schema: `docker exec supabase_db_flowgraph psql -U postgres -d postgres -c "\\dt public.*"` and `select * from pg_policies where schemaname = 'public';`.

## Out of scope (deferred)

- Hosted Supabase deployment.
- Multi-user / sharing / email-password auth (schema is multi-user-ready; only the UI is single-user).
- Saving runtime state mid-simulation (serializer-only change; `data jsonb` is wide enough).
- Run results / replay (Phase 3).
- Realtime subscriptions.
