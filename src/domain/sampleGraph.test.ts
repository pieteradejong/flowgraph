import { describe, expect, it } from 'vitest';
import { sampleGraph } from './sampleGraph';
import { step } from './simulation';
import type { EdgeStatus } from './types';

describe('sampleGraph', () => {
  it('exercises every status band after a single step', () => {
    const result = step(sampleGraph);
    const counts = result.edges.reduce<Record<EdgeStatus, number>>(
      (acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }),
      { healthy: 0, stressed: 0, saturated: 0, overloaded: 0 },
    );
    expect(counts).toEqual({ healthy: 1, stressed: 1, saturated: 2, overloaded: 1 });
  });

  it('starts with all edges idle (load 0, status healthy)', () => {
    expect(sampleGraph.edges.every((e) => e.load === 0 && e.status === 'healthy')).toBe(true);
  });

  it('has a unique source and sink', () => {
    const sources = sampleGraph.nodes.filter((n) => n.kind === 'source');
    const sinks = sampleGraph.nodes.filter((n) => n.kind === 'sink');
    expect(sources).toHaveLength(1);
    expect(sinks).toHaveLength(1);
  });
});
