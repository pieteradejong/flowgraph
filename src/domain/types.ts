export type NodeKind = 'source' | 'processor' | 'sink';

export interface FlowNode {
  id: string;
  kind: NodeKind;
  label?: string;
  /** Units emitted per step. Only meaningful for `source` nodes. */
  rate?: number;
}

export type EdgeStatus = 'healthy' | 'stressed' | 'saturated' | 'overloaded';

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  capacity: number;
  load: number;
  latency: number;
  status: EdgeStatus;
}

export interface Graph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
