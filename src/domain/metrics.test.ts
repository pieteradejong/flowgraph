import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics';
import { sampleGraph } from './sampleGraph';
import { runForSteps } from './simulation';
import type { Graph } from './types';

/** Steps enough to fill every pipeline in the sample graph (max path latency). */
const SAMPLE_STEADY_STATE_STEPS = 6;

describe('computeMetrics', () => {
  it('returns zeroed metrics for an empty graph', () => {
    expect(computeMetrics({ nodes: [], edges: [] })).toEqual({
      sourceEmission: 0,
      sinkThroughput: 0,
      averageUtilization: 0,
      maxUtilization: 0,
      statusCounts: { healthy: 0, stressed: 0, saturated: 0, overloaded: 0 },
      bottleneckEdgeIds: [],
    });
  });

  it('reports source emission across multiple sources', () => {
    const graph: Graph = {
      nodes: [
        { id: 's1', kind: 'source', rate: 10 },
        { id: 's2', kind: 'source', rate: 25 },
        { id: 't', kind: 'sink' },
      ],
      edges: [],
    };
    expect(computeMetrics(graph).sourceEmission).toBe(35);
  });

  it('treats sources without a rate as emitting zero', () => {
    const graph: Graph = {
      nodes: [{ id: 's', kind: 'source' }],
      edges: [],
    };
    expect(computeMetrics(graph).sourceEmission).toBe(0);
  });

  it('sums sink throughput only over edges entering sinks (at steady state)', () => {
    const stepped = runForSteps(sampleGraph, SAMPLE_STEADY_STATE_STEPS);
    const metrics = computeMetrics(stepped);
    const sinkInflow = stepped.edges
      .filter((e) => e.target === 'sink')
      .reduce((sum, e) => sum + e.load, 0);
    expect(metrics.sinkThroughput).toBeCloseTo(sinkInflow);
    expect(metrics.sinkThroughput).toBeCloseTo(100);
  });

  it('reports the sample graph status spread at steady state', () => {
    const metrics = computeMetrics(runForSteps(sampleGraph, SAMPLE_STEADY_STATE_STEPS));
    expect(metrics.statusCounts).toEqual({
      healthy: 1,
      stressed: 1,
      saturated: 2,
      overloaded: 1,
    });
    expect(metrics.bottleneckEdgeIds).toEqual(['e5']);
  });

  it('computes average and max utilization across all edges', () => {
    const stepped = runForSteps(sampleGraph, SAMPLE_STEADY_STATE_STEPS);
    const metrics = computeMetrics(stepped);
    expect(metrics.maxUtilization).toBeGreaterThan(1);
    expect(metrics.averageUtilization).toBeLessThan(metrics.maxUtilization);
    expect(metrics.averageUtilization).toBeGreaterThan(0);
  });

  it('does not mutate the input graph', () => {
    const snapshot = structuredClone(sampleGraph);
    computeMetrics(sampleGraph);
    expect(sampleGraph).toEqual(snapshot);
  });
});
