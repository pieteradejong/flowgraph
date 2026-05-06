import { describe, expect, it } from 'vitest';
import { computeMetrics } from '../metrics';
import { runForSteps } from '../simulation';
import { DEFAULT_SCENARIO, SCENARIOS, getScenario } from './index';

/**
 * Generous upper bound on steps needed for any scenario to reach steady state.
 * Satellite Network has the longest cumulative latency path (~12), so 30 is
 * comfortably above any current scenario's transit time.
 */
const STEADY_STATE_STEPS = 30;

describe('scenarios registry', () => {
  it('contains the default scenario', () => {
    expect(SCENARIOS).toContainEqual(DEFAULT_SCENARIO);
  });

  it('has unique scenario ids', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getScenario returns the matching scenario', () => {
    for (const s of SCENARIOS) {
      expect(getScenario(s.id)).toBe(s);
    }
  });

  it('getScenario falls back to the default for unknown ids', () => {
    expect(getScenario('does-not-exist')).toBe(DEFAULT_SCENARIO);
  });
});

describe.each(SCENARIOS)('scenario: $name', (scenario) => {
  const { graph } = scenario;

  it('has at least one source and at least one sink', () => {
    expect(graph.nodes.some((n) => n.kind === 'source')).toBe(true);
    expect(graph.nodes.some((n) => n.kind === 'sink')).toBe(true);
  });

  it('every edge references existing nodes', () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const e of graph.edges) {
      expect(ids.has(e.source), `edge ${e.id} source ${e.source} missing`).toBe(true);
      expect(ids.has(e.target), `edge ${e.id} target ${e.target} missing`).toBe(true);
    }
  });

  it('every node id is unique', () => {
    const ids = graph.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every edge id is unique', () => {
    const ids = graph.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts idle (every edge load is 0 and status is healthy)', () => {
    for (const e of graph.edges) {
      expect(e.load).toBe(0);
      expect(e.status).toBe('healthy');
    }
  });

  it('produces non-zero sink throughput at steady state', () => {
    const m = computeMetrics(runForSteps(graph, STEADY_STATE_STEPS));
    expect(m.sinkThroughput).toBeGreaterThan(0);
  });

  it('exhibits at least one non-healthy edge at steady state', () => {
    const stepped = runForSteps(graph, STEADY_STATE_STEPS);
    const nonHealthy = stepped.edges.filter((e) => e.status !== 'healthy');
    expect(nonHealthy.length).toBeGreaterThan(0);
  });
});
