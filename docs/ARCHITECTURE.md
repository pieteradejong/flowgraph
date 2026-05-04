# Architecture

## Core principle
Simulation engine is pure and UI-independent.

## Layers

UI (React)
↓
Domain (simulation engine)
↓
Persistence (later: Supabase)

## Domain modules

types.ts
- Node, Edge, Graph types

simulation.ts
- step(graph) -> graph

metrics.ts
- computeMetrics(graph)

## Key invariants

- Graph is directed
- No mutation inside simulation functions
- All state transitions are explicit
