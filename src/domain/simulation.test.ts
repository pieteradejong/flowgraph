import { describe, expect, it } from 'vitest';
import { inflightOn, runForSteps, statusFor, step, utilization } from './simulation';
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

  it('propagates load through a multi-hop chain (steady state)', () => {
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
    // Each edge has latency=1 (default in helper), so it takes 3 steps for
    // the source emission to fill all three edge pipelines.
    const result = runForSteps(graph, 3);
    expect(result.edges.map((e) => e.load)).toEqual([30, 30, 30]);
  });

  it('takes `latency` steps for flow to traverse an edge', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 50 },
        { id: 'p', kind: 'processor' },
        { id: 't', kind: 'sink' },
      ],
      edges: [
        edge({ id: 'e1', source: 's', target: 'p', capacity: 100, latency: 3 }),
        edge({ id: 'e2', source: 'p', target: 't', capacity: 100, latency: 1 }),
      ],
    };
    // After 1 step: only e1 has flow entering it; e2 still empty.
    const s1 = step(graph);
    expect(s1.edges[0]?.load).toBe(50);
    expect(s1.edges[1]?.load).toBe(0);

    // After 3 steps: e1's pipeline is full but the value hasn't reached p yet.
    expect(runForSteps(graph, 3).edges[1]?.load).toBe(0);

    // After 4 steps: e1's first emission has arrived at p, which forwards it.
    expect(runForSteps(graph, 4).edges[1]?.load).toBe(50);
  });

  it('drains the pipeline after a source stops emitting', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 40 },
        { id: 't', kind: 'sink' },
      ],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100, latency: 2 })],
    };
    // Run a few steps with the source emitting.
    const primed = runForSteps(graph, 5);
    expect(inflightOn(primed.edges[0]!)).toBeGreaterThan(0);

    // Set rate to 0 and step until the pipeline empties.
    const stopped: Graph = {
      ...primed,
      nodes: primed.nodes.map((n) =>
        n.kind === 'source' ? { ...n, rate: 0 } : n,
      ),
    };
    const drained = runForSteps(stopped, 3);
    expect(drained.edges[0]?.load).toBe(0);
    expect(inflightOn(drained.edges[0]!)).toBe(0);
  });

  it('treats latency=0 as no delay (delivers same step)', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 40 },
        { id: 'p', kind: 'processor' },
        { id: 't', kind: 'sink' },
      ],
      edges: [
        edge({ id: 'e1', source: 's', target: 'p', capacity: 100, latency: 0 }),
        edge({ id: 'e2', source: 'p', target: 't', capacity: 100, latency: 0 }),
      ],
    };
    const result = step(graph);
    expect(result.edges.map((e) => e.load)).toEqual([40, 40]);
  });

  it('runForSteps applies step n times and returns input for n<=0', () => {
    const graph: Graph = {
      nodes: [{ id: 's', kind: 'source', rate: 5 }, { id: 't', kind: 'sink' }],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100, latency: 1 })],
    };
    expect(runForSteps(graph, 0)).toEqual(graph);
    expect(runForSteps(graph, -1)).toEqual(graph);
    expect(runForSteps(graph, 2)).toEqual(step(step(graph)));
  });

  it('caps actual load at capacity but reports overloaded status from desired demand', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 200 },
        { id: 't', kind: 'sink' },
      ],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100 })],
    };
    const result = step(graph);
    // Backpressure: actual load capped at capacity ...
    expect(result.edges[0]?.load).toBe(100);
    // ... but status still reflects that demand exceeds capacity.
    expect(result.edges[0]?.status).toBe('overloaded');
  });

  it('queueing: bufferSize limits total in-flight flow on the edge', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 50 },
        { id: 't', kind: 'sink' },
      ],
      edges: [
        {
          id: 'e',
          source: 's',
          target: 't',
          capacity: 80,
          latency: 3,
          load: 0,
          status: 'healthy',
          bufferSize: 60,
        },
      ],
    };
    // Each step pushes 50 capped by buffer headroom. Pipeline length 3, so
    // after several steps total in-flight saturates near bufferSize.
    const stepped = runForSteps(graph, 10);
    expect(inflightOn(stepped.edges[0]!)).toBeLessThanOrEqual(60 + 1e-6);
  });

  it('failure on a node: zero outflow while down, recovers afterwards', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 40, downForSteps: 2 },
        { id: 't', kind: 'sink' },
      ],
      edges: [edge({ id: 'e', source: 's', target: 't', capacity: 100, latency: 0 })],
    };
    const s1 = step(graph);
    expect(s1.edges[0]?.load).toBe(0);
    expect(s1.nodes[0]?.downForSteps).toBe(1);

    const s2 = step(s1);
    expect(s2.edges[0]?.load).toBe(0);
    expect(s2.nodes[0]?.downForSteps).toBe(0);

    const s3 = step(s2);
    // Source recovered; flow resumes.
    expect(s3.edges[0]?.load).toBe(40);
  });

  it('failure on an edge: status is "down", load is 0, pipeline drains', () => {
    const graph: Graph = {
      nodes: [
        { id: 's', kind: 'source', rate: 30 },
        { id: 't', kind: 'sink' },
      ],
      edges: [
        {
          id: 'e',
          source: 's',
          target: 't',
          capacity: 100,
          latency: 2,
          load: 0,
          status: 'healthy',
          pipeline: [30, 30],
          downForSteps: 5,
        },
      ],
    };
    const s1 = step(graph);
    expect(s1.edges[0]?.status).toBe('down');
    expect(s1.edges[0]?.load).toBe(0);
    // Pipeline drains: head delivered, no new push.
    expect(s1.edges[0]?.pipeline).toEqual([30, 0]);
    expect(s1.edges[0]?.downForSteps).toBe(4);
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
