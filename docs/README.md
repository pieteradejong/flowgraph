# FlowGraph — documentation

Project overview and clone instructions: **[README.md](../README.md)** (repository root).

## What to read first

1. **[PURPOSE.md](PURPOSE.md)** — intent, audience, non-goals  
2. **[ROADMAP.md](ROADMAP.md)** — phases and cross-cutting work  
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — `domain` / `persistence` / UI boundaries  

## Reference

| File | Topic |
|------|--------|
| [CONVENTIONS.md](CONVENTIONS.md) | TypeScript and structure conventions |
| [LOGGING.md](LOGGING.md) | Logging and health-check patterns (generic; scripts template) |
| [PHASE_1_TASKS.md](PHASE_1_TASKS.md) | Phase 1 task breakdown (complete; historical detail) |
| [PHASE_2_TASKS.md](PHASE_2_TASKS.md) | Phase 2 persistence checklist + smoke commands |
| [GENERAL_LLM_ENHANCED_PROJECT_FRAMEWORK.md](GENERAL_LLM_ENHANCED_PROJECT_FRAMEWORK.md) | LLM collaboration patterns (this repo follows the three-scripts contract) |

## Scripts (same as template contract)

All live under `scripts/`:

| Script | Role |
|--------|------|
| `./scripts/init.sh` | Fresh clone: install deps (`npm ci` / detected stack) |
| `./scripts/run.sh` | Dev servers (`frontend`, `all`, …) |
| `./scripts/test.sh` | Tests, type-check; `--quick` skips some steps |
| `./scripts/db.sh` | Local Supabase: `start \| stop \| status \| reset \| migrate \| sync-env` |

Optional: `npm run smoke:phase2` after `./scripts/db.sh start` to verify persistence + RLS against the live stack.
