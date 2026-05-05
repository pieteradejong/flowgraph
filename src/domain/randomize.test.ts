import { describe, expect, it } from 'vitest';
import { randomizeRates } from './randomize';
import { sampleGraph } from './sampleGraph';

describe('randomizeRates', () => {
  it('only modifies source nodes', () => {
    const result = randomizeRates(sampleGraph, { minRate: 1, maxRate: 1, rng: () => 0 });
    for (const n of result.nodes) {
      const original = sampleGraph.nodes.find((o) => o.id === n.id);
      if (n.kind !== 'source') {
        expect(n).toEqual(original);
      }
    }
  });

  it('produces rates within [minRate, maxRate] using injected rng', () => {
    const result = randomizeRates(sampleGraph, { minRate: 50, maxRate: 60, rng: () => 0.5 });
    const source = result.nodes.find((n) => n.kind === 'source');
    expect(source?.rate).toBe(55);
  });

  it('does not mutate the input graph', () => {
    const snapshot = structuredClone(sampleGraph);
    randomizeRates(sampleGraph);
    expect(sampleGraph).toEqual(snapshot);
  });

  it('preserves all edges identically (apart from object identity)', () => {
    const result = randomizeRates(sampleGraph, { rng: () => 0 });
    expect(result.edges).toEqual(sampleGraph.edges);
  });
});
