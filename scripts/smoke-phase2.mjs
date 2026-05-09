#!/usr/bin/env node
/**
 * Phase 2 live smoke: snapshots + RLS (two anonymous sessions).
 * Requires Docker + `./scripts/db.sh start` and `.env.local` from `sync-env`.
 *
 * Run: node scripts/smoke-phase2.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvLocal() {
  const p = join(root, '.env.local');
  if (!existsSync(p)) {
    console.error('Missing .env.local — run ./scripts/db.sh start (or ./scripts/db.sh sync-env).');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    env[key] = val;
  }
  return env;
}

function makeClient() {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key } = loadEnvLocal();
  if (!url || !key) {
    console.error('.env.local must define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    process.exit(1);
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Persisted topology shape (matches serializer schemaVersion 1). */
function persistedGraph(capacity) {
  return {
    schemaVersion: 1,
    nodes: [
      { id: 's', kind: 'source', rate: 10 },
      { id: 'k', kind: 'sink' },
    ],
    edges: [{ id: 'e', source: 's', target: 'k', capacity, latency: 1 }],
  };
}

async function assertOk(label, error) {
  if (error) {
    console.error(`${label}:`, error.message ?? error);
    process.exit(1);
  }
}

async function main() {
  const clientA = makeClient();
  const { error: aSignErr } = await clientA.auth.signInAnonymously();
  await assertOk('User A anonymous sign-in', aSignErr);

  const {
    data: { user: userA },
    error: userAErr,
  } = await clientA.auth.getUser();
  await assertOk('User A getUser', userAErr);
  if (!userA) {
    console.error('No user A after sign-in');
    process.exit(1);
  }

  // --- RLS: user B must not see user A's graphs (before A creates any, list is empty)
  const clientB = makeClient();
  const { error: bSignErr } = await clientB.auth.signInAnonymously();
  await assertOk('User B anonymous sign-in', bSignErr);

  const { data: graphsBefore, error: listB0Err } = await clientB.from('graphs').select('id');
  await assertOk('User B list graphs (initial)', listB0Err);
  if ((graphsBefore ?? []).length !== 0) {
    console.error('Expected user B to start with zero graphs, got:', graphsBefore);
    process.exit(1);
  }

  // --- Create smoke-A with v1 capacity 100
  const { data: graphRow, error: insGErr } = await clientA
    .from('graphs')
    .insert({ name: 'smoke-A', user_id: userA.id })
    .select('id')
    .single();
  await assertOk('Insert graph smoke-A', insGErr);
  const graphId = graphRow.id;

  const { error: v1Err } = await clientA.from('graph_versions').insert({
    graph_id: graphId,
    version: 1,
    data: persistedGraph(100),
    message: 'v1',
  });
  await assertOk('Insert version 1', v1Err);

  const { error: v2Err } = await clientA.from('graph_versions').insert({
    graph_id: graphId,
    version: 2,
    data: persistedGraph(200),
    message: 'v2',
  });
  await assertOk('Insert version 2', v2Err);

  const { error: v3Err } = await clientA.from('graph_versions').insert({
    graph_id: graphId,
    version: 3,
    data: persistedGraph(300),
    message: 'v3',
  });
  await assertOk('Insert version 3', v3Err);

  const { data: versions, error: lvErr } = await clientA
    .from('graph_versions')
    .select('version')
    .eq('graph_id', graphId)
    .order('version', { ascending: false });
  await assertOk('List versions', lvErr);
  if (!versions || versions.length !== 3) {
    console.error('Expected 3 versions, got:', versions);
    process.exit(1);
  }

  const { data: v1Row, error: loadErr } = await clientA
    .from('graph_versions')
    .select('data')
    .eq('graph_id', graphId)
    .eq('version', 1)
    .single();
  await assertOk('Load version 1', loadErr);
  const cap = v1Row?.data?.edges?.[0]?.capacity;
  if (cap !== 100) {
    console.error('Restore check: expected capacity 100 on v1, got', cap);
    process.exit(1);
  }

  // --- RLS: B still cannot see A's graph
  const { data: graphsAfterA, error: listB1Err } = await clientB.from('graphs').select('id, name');
  await assertOk('User B list graphs (after A saved)', listB1Err);
  if ((graphsAfterA ?? []).length !== 0) {
    console.error('RLS failure: user B sees graphs:', graphsAfterA);
    process.exit(1);
  }

  // --- Delete graph (cascade versions)
  const { error: delErr } = await clientA.from('graphs').delete().eq('id', graphId);
  await assertOk('Delete smoke-A', delErr);

  const { data: left, error: listAErr } = await clientA.from('graphs').select('id');
  await assertOk('User A list after delete', listAErr);
  if ((left ?? []).length !== 0) {
    console.error('Expected no graphs after delete, got', left);
    process.exit(1);
  }

  console.log('Phase 2 smoke OK: 3 snapshots, v1 data check, RLS isolation, delete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
