import type { FlowEdge, FlowNode, Graph } from '../domain/types';

/**
 * Persisted topology — config fields only. Runtime state (load, pipeline,
 * status, downForSteps) is intentionally omitted; it gets reset to idle on
 * load. Saving mid-simulation is out of scope for Phase 2.
 */
export interface PersistedNode {
  id: string;
  kind: FlowNode['kind'];
  label?: string;
  rate?: number;
}

export interface PersistedEdge {
  id: string;
  source: string;
  target: string;
  capacity: number;
  latency: number;
  bufferSize?: number;
}

export interface PersistedGraph {
  schemaVersion: 1;
  nodes: PersistedNode[];
  edges: PersistedEdge[];
}

const stripUndefined = <T extends object>(obj: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
};

export const toPersisted = (graph: Graph): PersistedGraph => ({
  schemaVersion: 1,
  nodes: graph.nodes.map((n) =>
    stripUndefined({
      id: n.id,
      kind: n.kind,
      label: n.label,
      rate: n.rate,
    } satisfies PersistedNode),
  ),
  edges: graph.edges.map((e) =>
    stripUndefined({
      id: e.id,
      source: e.source,
      target: e.target,
      capacity: e.capacity,
      latency: e.latency,
      bufferSize: e.bufferSize,
    } satisfies PersistedEdge),
  ),
});

export const fromPersisted = (p: PersistedGraph): Graph => ({
  nodes: p.nodes.map(
    (n): FlowNode =>
      stripUndefined({
        id: n.id,
        kind: n.kind,
        label: n.label,
        rate: n.rate,
      } satisfies FlowNode),
  ),
  edges: p.edges.map(
    (e): FlowEdge =>
      stripUndefined({
        id: e.id,
        source: e.source,
        target: e.target,
        capacity: e.capacity,
        latency: e.latency,
        bufferSize: e.bufferSize,
        load: 0,
        pipeline: [],
        status: 'healthy',
      } satisfies FlowEdge),
  ),
});
