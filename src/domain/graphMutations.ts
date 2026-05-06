import type { FlowEdge, FlowNode, Graph, NodeKind } from './types';

const DEFAULT_EDGE_CAPACITY = 100;
const DEFAULT_EDGE_LATENCY = 1;
const DEFAULT_SOURCE_RATE = 50;

const findNumericSuffix = (existing: Set<string>, prefix: string): number => {
  let n = 1;
  while (existing.has(`${prefix}${n}`)) n++;
  return n;
};

export const nextNodeId = (graph: Graph): string => {
  const ids = new Set(graph.nodes.map((n) => n.id));
  return `node-${findNumericSuffix(ids, 'node-')}`;
};

export const nextEdgeId = (graph: Graph): string => {
  const ids = new Set(graph.edges.map((e) => e.id));
  return `edge-${findNumericSuffix(ids, 'edge-')}`;
};

/** Build a default node of the given kind and append it. Pure. */
export const createNode = (graph: Graph, kind: NodeKind, label?: string): Graph => {
  const id = nextNodeId(graph);
  const node: FlowNode = {
    id,
    kind,
    label: label ?? id,
    ...(kind === 'source' ? { rate: DEFAULT_SOURCE_RATE } : {}),
  };
  return { ...graph, nodes: [...graph.nodes, node] };
};

/**
 * Append an edge between two existing nodes with default capacity and latency.
 * Throws if `source` or `target` does not exist, or if the edge would be a self-loop.
 */
export const createEdge = (graph: Graph, source: string, target: string): Graph => {
  if (source === target) throw new Error(`self-loop not allowed: ${source}`);
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (!ids.has(source)) throw new Error(`unknown source node: ${source}`);
  if (!ids.has(target)) throw new Error(`unknown target node: ${target}`);
  const edge: FlowEdge = {
    id: nextEdgeId(graph),
    source,
    target,
    capacity: DEFAULT_EDGE_CAPACITY,
    latency: DEFAULT_EDGE_LATENCY,
    load: 0,
    status: 'healthy',
  };
  return { ...graph, edges: [...graph.edges, edge] };
};

/** Remove a node and any edges incident to it. Pure. */
export const removeNode = (graph: Graph, id: string): Graph => ({
  nodes: graph.nodes.filter((n) => n.id !== id),
  edges: graph.edges.filter((e) => e.source !== id && e.target !== id),
});

export const removeEdge = (graph: Graph, id: string): Graph => ({
  ...graph,
  edges: graph.edges.filter((e) => e.id !== id),
});

/**
 * Apply a partial patch to a node. The node's `id` cannot be changed.
 * If the kind changes from `source`, the `rate` is dropped to avoid stale values.
 */
export const updateNode = (graph: Graph, id: string, patch: Partial<FlowNode>): Graph => ({
  ...graph,
  nodes: graph.nodes.map((n) => {
    if (n.id !== id) return n;
    const merged: FlowNode = { ...n, ...patch, id: n.id };
    if (merged.kind !== 'source') delete merged.rate;
    return merged;
  }),
});

/**
 * Apply a partial patch to an edge. `id`, `source`, `target` cannot be changed
 * (delete + recreate to reroute an edge).
 */
export const updateEdge = (graph: Graph, id: string, patch: Partial<FlowEdge>): Graph => ({
  ...graph,
  edges: graph.edges.map((e) =>
    e.id === id ? { ...e, ...patch, id: e.id, source: e.source, target: e.target } : e,
  ),
});

/** Empty starting graph for "new blank" scenarios. */
export const emptyGraph: Graph = { nodes: [], edges: [] };
