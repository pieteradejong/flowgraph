# FlowGraph

Interactive **graph-based operational simulator**: build a directed flow graph (sources, processors, sinks), step the simulation, and see bottlenecks as edge utilization and status. React + Vite + React Flow; simulation logic lives in pure TypeScript under `src/domain/`.

## Quick start

```bash
./scripts/init.sh          # install npm deps
./scripts/test.sh          # type-check + unit tests (must pass before deploy)
./scripts/run.sh frontend  # dev server → http://127.0.0.1:5173
```

Core npm scripts: `npm run dev`, `npm run build`, `npm run test`, `npm run type-check`.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/PURPOSE.md](docs/PURPOSE.md) | Why FlowGraph exists and what it is not |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased plan (simulator → persistence → runs → visualization) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, persistence boundary, schema |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Code style |
| [docs/README.md](docs/README.md) | Full doc index + script reference |

## Local Supabase (optional)

Saving graphs to disk uses **local-only** Supabase via Docker (hosted is out of scope). API URL and keys are written to `.env.local` by the repo script:

```bash
./scripts/db.sh start       # Docker + supabase start + sync .env.local
npm run smoke:phase2        # persistence + RLS smoke (after start)
./scripts/db.sh stop        # when finished
```

Default API port in [`supabase/config.toml`](supabase/config.toml) is **55321** so another project can keep the usual **54321**. Copy [`.env.example`](.env.example) if you need a manual template; runtime values come from `./scripts/db.sh sync-env`.

## License

MIT
