import { Position, type Edge as RFEdge, type Node as RFNode } from '@xyflow/react';
import type { Graph } from '../domain/types';
import { NODE_BACKGROUND, STATUS_COLORS, STATUS_STROKE_WIDTH } from './statusColors';

const X_SPACING = 220;
const Y_SPACING = 110;

/** Assigns each node a depth based on the longest source-to-node path. */
const computeDepths = (graph: Graph): Map<string, number> => {
  const inDegree = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (const e of graph.edges) inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);

  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const n of graph.nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      depth.set(n.id, 0);
      queue.push(n.id);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift() as string;
    const next = (depth.get(id) ?? 0) + 1;
    for (const e of graph.edges) {
      if (e.source !== id) continue;
      if (next > (depth.get(e.target) ?? -1)) {
        depth.set(e.target, next);
        queue.push(e.target);
      }
    }
  }

  for (const n of graph.nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0);
  }
  return depth;
};

const computePositions = (graph: Graph): Map<string, { x: number; y: number }> => {
  const depth = computeDepths(graph);
  const layers = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    const layer = layers.get(d) ?? [];
    layer.push(n.id);
    layers.set(d, layer);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of layers.entries()) {
    ids.forEach((id, i) => {
      const yOffset = (i - (ids.length - 1) / 2) * Y_SPACING;
      positions.set(id, { x: d * X_SPACING, y: yOffset });
    });
  }
  return positions;
};

export const toReactFlowNodes = (graph: Graph, selectedId: string | null): RFNode[] => {
  const positions = computePositions(graph);
  return graph.nodes.map((n) => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    const rateSuffix = n.kind === 'source' && n.rate !== undefined ? ` (${n.rate})` : '';
    return {
      id: n.id,
      position: pos,
      data: { label: `${n.label ?? n.id}${rateSuffix}` },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: NODE_BACKGROUND[n.kind],
        color: '#fff',
        border: selectedId === n.id ? '2px solid #fbbf24' : '1px solid #1f2937',
        borderRadius: 6,
        padding: 8,
        fontSize: 12,
      },
    };
  });
};

export const toReactFlowEdges = (graph: Graph, selectedId: string | null): RFEdge[] =>
  graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: `${e.load.toFixed(1)} / ${e.capacity}`,
    labelStyle: { fontSize: 11, fill: '#1f2937' },
    labelBgStyle: { fill: '#fff', opacity: 0.85 },
    animated: e.status === 'overloaded' || e.status === 'saturated',
    style: {
      stroke: STATUS_COLORS[e.status],
      strokeWidth: STATUS_STROKE_WIDTH[e.status] + (selectedId === e.id ? 2 : 0),
    },
  }));
