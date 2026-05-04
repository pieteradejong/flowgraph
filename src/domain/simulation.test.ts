import { describe, expect, it } from 'vitest';
import { statusFor, step, utilization } from './simulation';
import type { FlowEdge, Graph } from './types';

const edge = (overrides: Partial<FlowEdge> & Pick<FlowEdge, 'id' | 'source' | 'target' | 'capacity'>): FlowEdge => ({
  load: 0,
  latency: 1,
  status: 'healthy',
  ...overrides,
});

describe('statusFor', () => {
  it.each([
    [0, 'healthy'],
    [0.69, 'healthy'],
    [0.7, 'stressed'],
    [0.94999, 'stressed'],
    [0.95, 'saturated'],
    [1.0, 'saturated'],
    [1.0001, 'overloaded'],
    [5.0, 'overloaded'],
  ] as const)('utilization %s -> %s', (u, expected) => {
    expect(statusFor(u)).toBe(expected);
  });
});

describe('utilization', () => {
  it('returns load / capacity for normal edges', () => {
    expect(utilization(edge({ id: 'e', source: 'a', target: 'b', capacity: 50, load: 25 }))).toBe(0.5);
  });

  it('returns 0 when capacity is 0 (no division by zero)', () => {
    expect(utilization(edge({ id: 'e', source: 'a', target: 'b', capacity: 0, load: 10 }))).toBe(0);
  });
});

describe('step', () => {
  it('handles an empty graph', () => {
    const result = step({ nodes: [], edges: [] });
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it('does not mutate its input (architectural invariant)', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 50 },
        { id: 't', kind: 'sink' },
      ],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100 })],
    };
    const snapshot = structuredClone(graph);
    step(graph);
    expect(graph).toEqual(snapshot);
  });

  it('delivers source rate onto a single outgoing edge', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 42 },
        { id: 't', kind: 'sink' },
      ],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100 })],
    };
    const result = step(graph);
    expect(result.edges[0]?.load).toBe(42);
    expect(result.edges[0]?.status).toBe('healthy');
  });

  it('splits node outflow across siblings proportionally to capacity', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 100 },
        { id: 'a', kind: 'sink' },
        { id: 'b', kind: 'sink' },
      ],
      edges: [
        edge({ id: 'ea', source: 's', target: 'a', capacity: 80 }),
        edge({ id: 'eb', source: 's', target: 'b', capacity: 20 }),
      ],
    };
    const result = step(graph);
    expect(result.edges[0]?.load).toBeCloseTo(80);
    expect(result.edges[1]?.load).toBeCloseTo(20);
    // Documented property: sibling edges share the same utilization.
    expect(utilization(result.edges[0]!)).toBeCloseTo(utilization(result.edges[1]!));
  });

  it('propagates load through a multi-hop chain', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 30 },
        { id: 'p1', kind: 'processor' },
        { id: 'p2', kind: 'processor' },
        { id: 't', kind: 'sink' },
      ],
      edges: [
        edge({ id: 'e1', source: 's', target: 'p1', capacity: 100 }),
        edge({ id: 'e2', source: 'p1', target: 'p2', capacity: 100 }),
        edge({ id: 'e3', source: 'p2', target: 't', capacity: 100 }),
      ],
    };
    const result = step(graph);
    expect(result.edges.map((e) => e.load)).toEqual([30, 30, 30]);
  });

  it('marks an edge as overloaded when desired flow exceeds capacity', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 200 },
        { id: 't', kind: 'sink' },
      ],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100 })],
    };
    const result = step(graph);
    expect(result.edges[0]?.load).toBe(200);
    expect(result.edges[0]?.status).toBe('overloaded');
  });

  it('terminates and produces zero load on a cycle', () => {
    const graph: Graph = {
      nodes: [
        { id: 'a', kind: 'processor' },
        { id: 'b', kind: 'processor' },
      ],
      edges: [
        edge({ id: 'eab', source: 'a', target: 'b', capacity: 10 }),
        edge({ id: 'eba', source: 'b', target: 'a', capacity: 10 }),
      ],
    };
    const result = step(graph);
    expect(result.edges.every((e) => e.load === 0)).toBe(true);
  });

  it('does not crash for a non-sink node with no outgoing edges', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 10 },
        { id: 'orphan', kind: 'processor' },
      ],
      edges: [],
    };
    expect(() => step(graph)).not.toThrow();
  });

  it('treats a source with no rate as emitting zero', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source' },
        { id: 't', kind: 'sink' },
      ],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100 })],
    };
    const result = step(graph);
    expect(result.edges[0]?.load).toBe(0);
  });

  it('is deterministic across repeated calls', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 17 },
        { id: 'p', kind: 'processor' },
        { id: 't', kind: 'sink' },
      ],
      edges: [
        edge({ id: 'e1', source: 's', target: 'p', capacity: 100 }),
        edge({ id: 'e2', source: 'p', target: 't', capacity: 100 }),
      ],
    };
    expect(step(graph)).toEqual(step(graph));
  });
});
