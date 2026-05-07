-- FlowGraph persistence schema (Phase 2)
--
-- Two tables:
--   graphs           - one row per named graph owned by a user
--   graph_versions   - immutable snapshot history; every Save creates a row
--
-- Topology only is stored. Runtime state (load, pipeline, status,
-- downForSteps) is reset to idle on load by the persistence serializer,
-- so the `data` column is plain jsonb and can be widened later without
-- a migration.
--
-- RLS: anonymous auth gives every browser session an auth.users row.
-- Owners see only their own graphs and their versions.

create extension if not exists "pgcrypto";

create table public.graphs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index graphs_user_id_idx on public.graphs (user_id);

create table public.graph_versions (
  id          uuid        primary key default gen_random_uuid(),
  graph_id    uuid        not null references public.graphs(id) on delete cascade,
  version     int         not null,
  data        jsonb       not null,
  message     text,
  created_at  timestamptz not null default now(),
  unique (graph_id, version)
);

create index graph_versions_browse_idx on public.graph_versions (graph_id, version desc);

alter table public.graphs         enable row level security;
alter table public.graph_versions enable row level security;

create policy graphs_owner on public.graphs
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy versions_via_owner on public.graph_versions
  for all
  using (exists (
    select 1 from public.graphs g
    where g.id = graph_id and g.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.graphs g
    where g.id = graph_id and g.user_id = auth.uid()
  ));
