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

export const isDown = (entity: { downForSteps?: number }): boolean =>
  (entity.downForSteps ?? 0) > 0;

const pipelineLength = (edge: FlowEdge): number => Math.max(0, Math.floor(edge.latency));

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

const tickDown = <T extends { downForSteps?: number }>(entity: T): T => {
  const d = entity.downForSteps;
  if (d === undefined || d <= 0) return entity;
  return { ...entity, downForSteps: d - 1 };
};

/**
 * Advances the simulation by one step. Pure.
 *
 * Pipeline propagation:
 * - Each non-zero-latency edge holds an oldest-first FIFO pipeline of length
 *   `latency`. Per step the head is delivered to the target and a new value
 *   is pushed at the tail.
 *
 * Backpressure (Model A):
 * - Per edge, `actual = min(desired, capacity, bufferHeadroom)`. `load` is
 *   the actual; `status` is computed from `desired/capacity` so an
 *   `overloaded` band still fires even when load is capped.
 *
 * Queueing:
 * - Optional `bufferSize` caps total in-flight flow. The remaining headroom
 *   limits per-step acceptance.
 *
 * Failures:
 * - Nodes with `downForSteps > 0` produce no outflow; their `rate` is
 *   ignored. Edges with `downForSteps > 0` accept no new flow but their
 *   pipelines continue to shift (in-flight values still arrive at the
 *   target). `downForSteps` decrements each step until it reaches 0.
 */
export const step = (graph: Graph): Graph => {
  const order = topologicalOrder(graph);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const oldPipelines = new Map<string, number[]>(
    graph.edges.map((e) => [e.id, ensurePipeline(e)]),
  );
  const desiredOutflow = new Map<string, number>();

  for (const id of order) {
    const node = nodeById.get(id);
    if (!node || node.kind === 'sink') continue;
    if (isDown(node)) continue;

    let inflow = 0;
    if (node.kind === 'source') {
      inflow = node.rate ?? 0;
    } else {
      for (const e of graph.edges) {
        if (e.target !== id) continue;
        if (pipelineLength(e) === 0) {
          // Latency-0 edges deliver this step's outflow instantly. A down
          // edge passes nothing.
          inflow += isDown(e) ? 0 : desiredOutflow.get(e.id) ?? 0;
        } else {
          // Buffered edges deliver the pipeline head — the in-flight value
          // that finished traversing. Down edges still drain in-flight flow.
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
      desiredOutflow.set(e.id, share);
    }
  }

  const edges: FlowEdge[] = graph.edges.map((e) => {
    const oldPipe = oldPipelines.get(e.id) ?? [];
    const len = pipelineLength(e);

    if (isDown(e)) {
      const newPipe = len === 0 ? [] : [...oldPipe.slice(1), 0];
      return tickDown({ ...e, load: 0, pipeline: newPipe, status: 'down' as const });
    }

    const desired = desiredOutflow.get(e.id) ?? 0;
    const inflightAfterPop = oldPipe.slice(1).reduce((s, v) => s + v, 0);
    const bufferHeadroom =
      e.bufferSize === undefined ? Infinity : Math.max(0, e.bufferSize - inflightAfterPop);
    const actual = Math.min(desired, e.capacity, bufferHeadroom);
    const newPipe = len === 0 ? [] : [...oldPipe.slice(1), actual];

    const demandUtil = e.capacity > 0 ? desired / e.capacity : 0;
    return tickDown({ ...e, load: actual, pipeline: newPipe, status: statusFor(demandUtil) });
  });

  const nodes: FlowNode[] = graph.nodes.map((n) => tickDown({ ...n }));

  return { nodes, edges };
};

/** Apply `step` `n` times. `n <= 0` returns the input. */
export const runForSteps = (graph: Graph, n: number): Graph => {
  let g = graph;
  for (let i = 0; i < n; i++) g = step(g);
  return g;
};
