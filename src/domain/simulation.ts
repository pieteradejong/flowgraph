import type { EdgeStatus, FlowEdge, FlowNode, Graph } from './types';

const STRESSED = 0.7;
const SATURATED = 0.95;
const OVERLOADED = 1.0;

export const utilization = (edge: FlowEdge): number =>
  edge.capacity > 0 ? edge.load / edge.capacity : 0;

export const statusFor = (u: number): EdgeStatus => {
  if (u > OVERLOADED) return 'overloaded';
  if (u >= SATURATED) return 'saturated';
  if (u >= STRESSED) return 'stressed';
  return 'healthy';
};

const topologicalOrder = (graph: Graph): string[] => {
  const inDegree = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
  for (const e of graph.edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue = graph.nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const e of graph.edges) {
      if (e.source !== id) continue;
      const next = (inDegree.get(e.target) ?? 0) - 1;
      inDegree.set(e.target, next);
      if (next === 0) queue.push(e.target);
    }
  }

  // Append any remaining nodes (cycles) to keep the function total.
  for (const n of graph.nodes) {
    if (!order.includes(n.id)) order.push(n.id);
  }
  return order;
};

const inflowFor = (
  node: FlowNode,
  graph: Graph,
  edgeLoad: Map<string, number>,
): number => {
  if (node.kind === 'source') return node.rate ?? 0;
  let sum = 0;
  for (const e of graph.edges) {
    if (e.target === node.id) sum += edgeLoad.get(e.id) ?? 0;
  }
  return sum;
};

/**
 * Advances the simulation by one step.
 *
 * Pure: returns a new `Graph` without mutating the input.
 * Sources emit their `rate`, processors forward all inflow, sinks absorb.
 * A node's outflow is split across outgoing edges proportionally to capacity.
 * Edge `load` may exceed `capacity`, producing an `overloaded` status.
 */
export const step = (graph: Graph): Graph => {
  const order = topologicalOrder(graph);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgeLoad = new Map<string, number>();

  for (const id of order) {
    const node = nodeById.get(id);
    if (!node || node.kind === 'sink') continue;

    const inflow = inflowFor(node, graph, edgeLoad);
    const outgoing = graph.edges.filter((e) => e.source === id);
    if (outgoing.length === 0) continue;

    const totalCapacity = outgoing.reduce((s, e) => s + e.capacity, 0);
    for (const e of outgoing) {
      const share = totalCapacity > 0 ? inflow * (e.capacity / totalCapacity) : 0;
      edgeLoad.set(e.id, share);
    }
  }

  const edges: FlowEdge[] = graph.edges.map((e) => {
    const load = edgeLoad.get(e.id) ?? 0;
    return { ...e, load, status: statusFor(e.capacity > 0 ? load / e.capacity : 0) };
  });

  return {
    nodes: graph.nodes.map((n) => ({ ...n })),
    edges,
  };
};
