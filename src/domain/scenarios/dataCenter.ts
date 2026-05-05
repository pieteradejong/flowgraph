import type { FlowEdge, Graph } from '../types';

const e = (
  id: string,
  source: string,
  target: string,
  capacity: number,
  latency = 1,
): FlowEdge => ({ id, source, target, capacity, latency, load: 0, status: 'healthy' });

/**
 * Three-tier web stack:
 *
 *   internet → load-balancer → {app-1, app-2} → {cache, database} → response-sink
 *                                                              database → log-sink
 *
 * After one step the database edges saturate while the cache path stays comfortable —
 * the canonical "database is the bottleneck" pattern.
 */
export const dataCenter: Graph = {
  nodes: [
    { id: 'internet', kind: 'source', label: 'Internet', rate: 300 },
    { id: 'lb', kind: 'processor', label: 'Load Balancer' },
    { id: 'app-1', kind: 'processor', label: 'App Pool 1' },
    { id: 'app-2', kind: 'processor', label: 'App Pool 2' },
    { id: 'cache', kind: 'processor', label: 'Cache' },
    { id: 'db', kind: 'processor', label: 'Database' },
    { id: 'response-sink', kind: 'sink', label: 'Responses' },
    { id: 'log-sink', kind: 'sink', label: 'Logs' },
  ],
  edges: [
    e('dc-1', 'internet', 'lb', 500),
    e('dc-2', 'lb', 'app-1', 180),
    e('dc-3', 'lb', 'app-2', 180),
    e('dc-4', 'app-1', 'cache', 130),
    e('dc-5', 'app-1', 'db', 25),
    e('dc-6', 'app-2', 'cache', 130),
    e('dc-7', 'app-2', 'db', 25),
    e('dc-8', 'cache', 'response-sink', 300),
    e('dc-9', 'db', 'response-sink', 20),
    e('dc-10', 'db', 'log-sink', 10),
  ],
};
