import type { Graph } from './types';

/**
 * A small DAG that exercises every edge status band:
 *
 *   src ──► ingress ──► worker-a ──► sink
 *                  └─► worker-b ──┘
 *
 * Capacities are chosen so a single `step` produces a healthy edge,
 * a stressed edge, a saturated edge, and an overloaded edge.
 */
export const sampleGraph: Graph = {
  nodes: [
    { id: 'src', kind: 'source', label: 'Source', rate: 100 },
    { id: 'ingress', kind: 'processor', label: 'Ingress' },
    { id: 'worker-a', kind: 'processor', label: 'Worker A' },
    { id: 'worker-b', kind: 'processor', label: 'Worker B' },
    { id: 'sink', kind: 'sink', label: 'Sink' },
  ],
  edges: [
    { id: 'e1', source: 'src', target: 'ingress', capacity: 200, load: 0, latency: 1, status: 'healthy' },
    { id: 'e2', source: 'ingress', target: 'worker-a', capacity: 80, load: 0, latency: 2, status: 'healthy' },
    { id: 'e3', source: 'ingress', target: 'worker-b', capacity: 25, load: 0, latency: 2, status: 'healthy' },
    { id: 'e4', source: 'worker-a', target: 'sink', capacity: 100, load: 0, latency: 1, status: 'healthy' },
    { id: 'e5', source: 'worker-b', target: 'sink', capacity: 20, load: 0, latency: 1, status: 'healthy' },
  ],
};
