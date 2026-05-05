import type { Graph } from './types';

export interface RandomizeOptions {
  minRate: number;
  maxRate: number;
  /** Inject a deterministic RNG for tests. Defaults to `Math.random`. */
  rng?: () => number;
}

const DEFAULTS: RandomizeOptions = { minRate: 0, maxRate: 200 };

/**
 * Returns a new graph with each `source` node's `rate` reassigned to a
 * uniformly-random integer in `[minRate, maxRate]`. All other fields are
 * carried through unchanged. Pure: input is not mutated.
 */
export const randomizeRates = (graph: Graph, options: Partial<RandomizeOptions> = {}): Graph => {
  const { minRate, maxRate, rng = Math.random } = { ...DEFAULTS, ...options };
  const span = Math.max(0, maxRate - minRate);
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.kind === 'source' ? { ...n, rate: Math.round(minRate + rng() * span) } : { ...n },
    ),
    edges: graph.edges.map((e) => ({ ...e })),
  };
};
