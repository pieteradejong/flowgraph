import type { EdgeStatus, FlowEdge, Graph } from './types';

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

const pipelineLength = (edge: FlowEdge): number => Math.max(0, Math.floor(edge.latency));

/**
 * Returns a pipeline buffer of the right length for `edge`. If the edge already
 * carries a buffer, it is reshaped (truncated newest-first or zero-padded
 * oldest-first) when the latency has been edited mid-run.
 */
const ensurePipeline = (edge: FlowEdge): number[] => {
  const len = pipelineLength(edge);
  const existing = edge.pipeline ?? [];
  if (existing.length === len) return existing.slice();
  if (existing.length > len) return existing.slice(existing.length - len);
  return [...new Array<number>(len - existing.length).fill(0), ...existing];
};

/** Total in-flight flow on an edge — useful for inspector/metrics display. */
export const inflightOn = (edge: FlowEdge): number => {
  const pipe = edge.pipeline ?? [];
  return pipe.reduce((s, v) => s + v, 0);
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

  for (const n of graph.nodes) {
    if (!order.includes(n.id)) order.push(n.id);
  }
  return order;
};

/**
 * Advances the simulation by one step.
 *
 * Pure: returns a new `Graph` without mutating the input.
 *
 * Two-phase pipeline propagation:
 * 1. In topological order, compute each node's inflow this step (sources emit
 *    their `rate`; non-sources sum the heads of their incoming pipelines —
 *    flow that has finished traversing the upstream edge — or, for edges with
 *    `latency: 0`, the just-computed outflow from upstream). Distribute that
 *    inflow proportionally across outgoing edges by capacity.
 * 2. Commit each edge: shift the pipeline left, push this step's outflow as
 *    the new tail. `load` is the just-pushed outflow (the rate entering the
 *    edge), which after `latency` more steps will reach the target.
 */
export const step = (graph: Graph): Graph => {
  const order = topologicalOrder(graph);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const oldPipelines = new Map<string, number[]>(
    graph.edges.map((e) => [e.id, ensurePipeline(e)]),
  );
  const outflow = new Map<string, number>();

  for (const id of order) {
    const node = nodeById.get(id);
    if (!node || node.kind === 'sink') continue;

    let inflow = 0;
    if (node.kind === 'source') {
      inflow = node.rate ?? 0;
    } else {
      for (const e of graph.edges) {
        if (e.target !== id) continue;
        if (pipelineLength(e) === 0) {
          inflow += outflow.get(e.id) ?? 0;
        } else {
          const pipe = oldPipelines.get(e.id);
          inflow += pipe?.[0] ?? 0;
        }
      }
    }

    const outgoing = graph.edges.filter((e) => e.source === id);
    if (outgoing.length === 0) continue;
    const totalCapacity = outgoing.reduce((s, e) => s + e.capacity, 0);
    for (const e of outgoing) {
      const share = totalCapacity > 0 ? inflow * (e.capacity / totalCapacity) : 0;
      outflow.set(e.id, share);
    }
  }

  const edges: FlowEdge[] = graph.edges.map((e) => {
    const out = outflow.get(e.id) ?? 0;
    const oldPipe = oldPipelines.get(e.id) ?? [];
    const newPipe = pipelineLength(e) === 0 ? [] : [...oldPipe.slice(1), out];
    return {
      ...e,
      load: out,
      pipeline: newPipe,
      status: statusFor(e.capacity > 0 ? out / e.capacity : 0),
    };
  });

  return {
    nodes: graph.nodes.map((n) => ({ ...n })),
    edges,
  };
};

/** Apply `step` `n` times. `n <= 0` returns a fresh shallow copy. */
export const runForSteps = (graph: Graph, n: number): Graph => {
  let g = graph;
  for (let i = 0; i < n; i++) g = step(g);
  return g;
};
