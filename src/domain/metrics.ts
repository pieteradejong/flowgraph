import { utilization } from './simulation';
import type { EdgeStatus, Graph } from './types';

export interface Metrics {
  /** Sum of `rate` across all source nodes. */
  sourceEmission: number;
  /** Sum of edge load arriving at sink nodes. */
  sinkThroughput: number;
  /** Mean utilization across all edges (0 if no edges). */
  averageUtilization: number;
  /** Maximum utilization across all edges (0 if no edges). */
  maxUtilization: number;
  /** Count of edges per status band. */
  statusCounts: Record<EdgeStatus, number>;
  /** IDs of edges currently in the `overloaded` band. */
  bottleneckEdgeIds: string[];
}

const EMPTY_STATUS_COUNTS: Record<EdgeStatus, number> = {
  healthy: 0,
  stressed: 0,
  saturated: 0,
  overloaded: 0,
  down: 0,
};

/**
 * Pure read-only summary of the current graph state.
 *
 * Intended to drive the metrics panel and any future time-series collection.
 * Does not mutate `graph` and does not advance the simulation.
 */
export const computeMetrics = (graph: Graph): Metrics => {
  const sinkIds = new Set(graph.nodes.filter((n) => n.kind === 'sink').map((n) => n.id));

  const sourceEmission = graph.nodes
    .filter((n) => n.kind === 'source')
    .reduce((sum, n) => sum + (n.rate ?? 0), 0);

  const sinkThroughput = graph.edges
    .filter((e) => sinkIds.has(e.target))
    .reduce((sum, e) => sum + e.load, 0);

  const utilizations = graph.edges.map(utilization);
  const averageUtilization =
    utilizations.length > 0 ? utilizations.reduce((a, b) => a + b, 0) / utilizations.length : 0;
  const maxUtilization = utilizations.length > 0 ? Math.max(...utilizations) : 0;

  const statusCounts = graph.edges.reduce<Record<EdgeStatus, number>>(
    (acc, e) => ({ ...acc, [e.status]: acc[e.status] + 1 }),
    { ...EMPTY_STATUS_COUNTS },
  );

  const bottleneckEdgeIds = graph.edges.filter((e) => e.status === 'overloaded').map((e) => e.id);

  return {
    sourceEmission,
    sinkThroughput,
    averageUtilization,
    maxUtilization,
    statusCounts,
    bottleneckEdgeIds,
  };
};
