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
  /** Current rate of flow entering the edge this step. */
  load: number;
  /** Number of steps it takes for flow to traverse this edge. */
  latency: number;
  status: EdgeStatus;
  /**
   * In-flight values, oldest first. Length equals `latency`. Pipeline[0] is
   * delivered to the target on the next step. Optional in input data; the
   * simulation initialises and maintains it.
   */
  pipeline?: number[];
}

export interface Graph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
