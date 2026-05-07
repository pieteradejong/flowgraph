import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Graph } from '../domain/types';
import { __setClientForTests } from './client';
import {
  createGraph,
  deleteGraph,
  listGraphs,
  listVersions,
  loadVersion,
  renameGraph,
  saveSnapshot,
} from './graphs';

/**
 * Minimal Supabase mock. Records every chained call as `{table, method, args}`
 * tuples. Each terminal await pulls the next response off `responseQueue`.
 *
 * The chain methods (.select, .insert, .eq, .order, …) return `this` so any
 * order works. Terminal methods that callers actually await (.single,
 * .maybeSingle, or the implicit thenable on the builder itself) resolve to
 * the next queued response.
 */
type QueuedResponse = { data: unknown; error: unknown };

interface MockState {
  calls: Array<{ table: string; method: string; args: unknown[] }>;
  responseQueue: QueuedResponse[];
  user: { id: string } | null;
}

const makeMock = (user = { id: 'user-1' }): { client: SupabaseClient; state: MockState } => {
  const state: MockState = { calls: [], responseQueue: [], user };

  const builder: Record<string, unknown> & PromiseLike<QueuedResponse> = {
    then(resolve: (v: QueuedResponse) => unknown) {
      const next = state.responseQueue.shift() ?? { data: null, error: null };
      return Promise.resolve(next).then(resolve);
    },
  } as never;

  const recordingMethod = (table: string, method: string) => (...args: unknown[]) => {
    state.calls.push({ table, method, args });
    return builder;
  };

  const wrapBuilder = (table: string) => {
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit'];
    for (const m of methods) {
      (builder as Record<string, unknown>)[m] = recordingMethod(table, m);
    }
    (builder as Record<string, unknown>).single = async () => {
      state.calls.push({ table, method: 'single', args: [] });
      return state.responseQueue.shift() ?? { data: null, error: null };
    };
    (builder as Record<string, unknown>).maybeSingle = async () => {
      state.calls.push({ table, method: 'maybeSingle', args: [] });
      return state.responseQueue.shift() ?? { data: null, error: null };
    };
    return builder;
  };

  const client = {
    from: (table: string) => wrapBuilder(table),
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
      getSession: async () => ({ data: { session: state.user ? { user: state.user } : null }, error: null }),
      signInAnonymously: async () => ({ data: { user: state.user }, error: null }),
    },
  } as unknown as SupabaseClient;

  return { client, state };
};

const sampleGraph: Graph = {
  nodes: [
    { id: 'a', kind: 'source', rate: 100 },
    { id: 'b', kind: 'sink' },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b', capacity: 80, latency: 0, load: 0, status: 'healthy' },
  ],
};

describe('persistence/graphs', () => {
  let mock: ReturnType<typeof makeMock>;

  beforeEach(() => {
    mock = makeMock();
    __setClientForTests(mock.client);
  });

  afterEach(() => {
    __setClientForTests(null);
    vi.restoreAllMocks();
  });

  it('listGraphs queries graphs ordered by updated_at desc', async () => {
    mock.state.responseQueue.push({
      data: [
        { id: 'g1', name: 'A', created_at: 't1', updated_at: 't2' },
        { id: 'g2', name: 'B', created_at: 't3', updated_at: 't4' },
      ],
      error: null,
    });

    const rows = await listGraphs();

    expect(rows).toEqual([
      { id: 'g1', name: 'A', createdAt: 't1', updatedAt: 't2' },
      { id: 'g2', name: 'B', createdAt: 't3', updatedAt: 't4' },
    ]);
    const tables = mock.state.calls.map((c) => `${c.table}.${c.method}`);
    expect(tables).toContain('graphs.select');
    expect(tables).toContain('graphs.order');
  });

  it('createGraph inserts a graphs row + initial version 1', async () => {
    mock.state.responseQueue.push({ data: { id: 'new-graph' }, error: null });
    mock.state.responseQueue.push({ data: null, error: null });

    const { graphId, version } = await createGraph('My graph', sampleGraph, 'first');

    expect(graphId).toBe('new-graph');
    expect(version).toBe(1);

    const insertCalls = mock.state.calls.filter((c) => c.method === 'insert');
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0]?.table).toBe('graphs');
    expect(insertCalls[0]?.args[0]).toMatchObject({ name: 'My graph', user_id: 'user-1' });
    expect(insertCalls[1]?.table).toBe('graph_versions');
    expect(insertCalls[1]?.args[0]).toMatchObject({
      graph_id: 'new-graph',
      version: 1,
      message: 'first',
    });
  });

  it('saveSnapshot reads max version and inserts version+1', async () => {
    mock.state.responseQueue.push({ data: { version: 7 }, error: null });
    mock.state.responseQueue.push({ data: null, error: null });
    mock.state.responseQueue.push({ data: null, error: null });

    const v = await saveSnapshot('graph-x', sampleGraph, 'change A');

    expect(v).toBe(8);
    const inserts = mock.state.calls.filter((c) => c.method === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.table).toBe('graph_versions');
    expect(inserts[0]?.args[0]).toMatchObject({
      graph_id: 'graph-x',
      version: 8,
      message: 'change A',
    });
  });

  it('saveSnapshot starts at version 1 when no prior versions exist', async () => {
    mock.state.responseQueue.push({ data: null, error: null });
    mock.state.responseQueue.push({ data: null, error: null });
    mock.state.responseQueue.push({ data: null, error: null });

    const v = await saveSnapshot('graph-y', sampleGraph);
    expect(v).toBe(1);
  });

  it('loadVersion(graphId) returns the latest version when no version arg', async () => {
    const persistedData = {
      schemaVersion: 1,
      nodes: [{ id: 'a', kind: 'source', rate: 100 }],
      edges: [{ id: 'e1', source: 'a', target: 'a', capacity: 80, latency: 0 }],
    };
    mock.state.responseQueue.push({ data: { data: persistedData, version: 5 }, error: null });

    const graph = await loadVersion('graph-z');

    expect(graph.nodes[0]?.id).toBe('a');
    expect(graph.edges[0]?.load).toBe(0);
    expect(graph.edges[0]?.status).toBe('healthy');

    const ordered = mock.state.calls.find((c) => c.method === 'order');
    expect(ordered?.args[0]).toBe('version');
  });

  it('loadVersion(graphId, n) targets a specific version', async () => {
    const persistedData = {
      schemaVersion: 1,
      nodes: [],
      edges: [],
    };
    mock.state.responseQueue.push({ data: { data: persistedData, version: 3 }, error: null });

    await loadVersion('graph-z', 3);

    const eqCalls = mock.state.calls.filter((c) => c.method === 'eq');
    expect(eqCalls.some((c) => c.args[0] === 'version' && c.args[1] === 3)).toBe(true);
  });

  it('listVersions returns rows in version-desc order', async () => {
    mock.state.responseQueue.push({
      data: [
        { id: 'v3', graph_id: 'g', version: 3, message: 'tweak', created_at: 't3' },
        { id: 'v2', graph_id: 'g', version: 2, message: null, created_at: 't2' },
        { id: 'v1', graph_id: 'g', version: 1, message: 'init', created_at: 't1' },
      ],
      error: null,
    });

    const versions = await listVersions('g');
    expect(versions.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(versions[1]?.message).toBeNull();
  });

  it('renameGraph and deleteGraph hit the graphs table by id', async () => {
    mock.state.responseQueue.push({ data: null, error: null });
    await renameGraph('g1', 'New name');
    const updates = mock.state.calls.filter((c) => c.method === 'update');
    expect(updates[0]?.args[0]).toMatchObject({ name: 'New name' });

    mock.state.responseQueue.push({ data: null, error: null });
    await deleteGraph('g1');
    const deletes = mock.state.calls.filter((c) => c.method === 'delete');
    expect(deletes).toHaveLength(1);
  });

  it('throws PersistenceError when client returns an error', async () => {
    mock.state.responseQueue.push({ data: null, error: { message: 'boom' } });
    await expect(listGraphs()).rejects.toThrow(/Failed to list graphs/);
  });
});
