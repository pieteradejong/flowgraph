import {
  Background,
  Controls as RFControls,
  ReactFlow,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import type { Graph } from '../domain/types';
import { toReactFlowEdges, toReactFlowNodes } from './graphAdapter';

interface Props {
  graph: Graph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onConnect: (source: string, target: string) => void;
  onDelete: (id: string) => void;
}

export const GraphCanvas = ({ graph, selectedId, onSelect, onConnect, onDelete }: Props) => {
  const nodes = useMemo(() => toReactFlowNodes(graph, selectedId), [graph, selectedId]);
  const edges = useMemo(() => toReactFlowEdges(graph, selectedId), [graph, selectedId]);

  const handleConnect = (c: Connection) => {
    if (c.source && c.target && c.source !== c.target) onConnect(c.source, c.target);
  };

  const handleNodesDelete = (deleted: RFNode[]) => {
    deleted.forEach((n) => onDelete(n.id));
  };

  const handleEdgesDelete = (deleted: RFEdge[]) => {
    deleted.forEach((e) => onDelete(e.id));
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={(_, n) => onSelect(n.id)}
      onEdgeClick={(_, e) => onSelect(e.id)}
      onPaneClick={() => onSelect(null)}
      onConnect={handleConnect}
      onNodesDelete={handleNodesDelete}
      onEdgesDelete={handleEdgesDelete}
      nodesDraggable={false}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} />
      <RFControls />
    </ReactFlow>
  );
};
