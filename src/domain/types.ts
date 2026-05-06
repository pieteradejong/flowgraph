export type NodeKind = 'source' | 'processor' | 'sink';

export interface FlowNode {
  id: string;
  kind: NodeKind;
  label?: string;
  /** Units emitted per step. Only meaningful for `source` nodes. */
  rate?: number;
  /** Steps remaining offline. 0 / undefined = up. Decrements each `step`. */
  downForSteps?: number;
}

export type EdgeStatus = 'healthy' | 'stressed' | 'saturated' | 'overloaded' | 'down';

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  capacity: number;
  /** Current rate of flow entering the edge this step (capped at capacity). */
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
  /** Optional cap on total in-flight flow (sum of pipeline). Infinite if unset. */
  bufferSize?: number;
  /** Steps remaining offline. 0 / undefined = up. Decrements each `step`. */
  downForSteps?: number;
}

export interface Graph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
