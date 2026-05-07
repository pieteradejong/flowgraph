import { describe, expect, it } from 'vitest';
import type { Graph } from '../domain/types';
import { fromPersisted, toPersisted } from './serialize';

describe('serialize', () => {
  it('round-trips topology fields', () => {
    const graph: Graph = {
      nodes: [
        { id: 'a', kind: 'source', label: 'A', rate: 100 },
        { id: 'b', kind: 'sink', label: 'B' },
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'b',
          capacity: 80,
          latency: 2,
          load: 0,
          status: 'healthy',
        },
      ],
    };
    const round = fromPersisted(toPersisted(graph));
    expect(round.nodes).toEqual(graph.nodes);
    expect(round.edges[0]?.id).toBe('e1');
    expect(round.edges[0]?.capacity).toBe(80);
    expect(round.edges[0]?.latency).toBe(2);
  });

  it('strips runtime state on the way out', () => {
    const graph: Graph = {
      nodes: [{ id: 'a', kind: 'source', rate: 50, downForSteps: 3 }],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'a',
          capacity: 100,
          latency: 2,
          load: 42,
          pipeline: [10, 20],
          status: 'overloaded',
          downForSteps: 5,
          bufferSize: 200,
        },
      ],
    };
    const persisted = toPersisted(graph);
    expect(persisted.schemaVersion).toBe(1);
    expect(persisted.nodes[0]).toEqual({ id: 'a', kind: 'source', rate: 50 });
    expect(persisted.edges[0]).toEqual({
      id: 'e1',
      source: 'a',
      target: 'a',
      capacity: 100,
      latency: 2,
      bufferSize: 200,
    });
    expect(persisted.edges[0]).not.toHaveProperty('load');
    expect(persisted.edges[0]).not.toHaveProperty('pipeline');
    expect(persisted.edges[0]).not.toHaveProperty('status');
    expect(persisted.edges[0]).not.toHaveProperty('downForSteps');
  });

  it('rehydrates with idle defaults', () => {
    const persisted = {
      schemaVersion: 1 as const,
      nodes: [{ id: 'a', kind: 'source' as const, rate: 50 }],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'a',
          capacity: 100,
          latency: 2,
        },
      ],
    };
    const graph = fromPersisted(persisted);
    expect(graph.nodes[0]?.downForSteps).toBeUndefined();
    expect(graph.edges[0]?.load).toBe(0);
    expect(graph.edges[0]?.pipeline).toEqual([]);
    expect(graph.edges[0]?.status).toBe('healthy');
    expect(graph.edges[0]?.downForSteps).toBeUndefined();
  });

  it('omits undefined optional fields after round-trip', () => {
    const graph: Graph = {
      nodes: [{ id: 'a', kind: 'sink' }],
      edges: [],
    };
    const persisted = toPersisted(graph);
    expect(persisted.nodes[0]).not.toHaveProperty('label');
    expect(persisted.nodes[0]).not.toHaveProperty('rate');
  });
});
