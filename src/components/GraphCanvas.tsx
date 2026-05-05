import { Background, Controls as RFControls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import type { Graph } from '../domain/types';
import { toReactFlowEdges, toReactFlowNodes } from './graphAdapter';

interface Props {
  graph: Graph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const GraphCanvas = ({ graph, selectedId, onSelect }: Props) => {
  const nodes = useMemo(() => toReactFlowNodes(graph, selectedId), [graph, selectedId]);
  const edges = useMemo(() => toReactFlowEdges(graph, selectedId), [graph, selectedId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={(_, n) => onSelect(n.id)}
      onEdgeClick={(_, e) => onSelect(e.id)}
      onPaneClick={() => onSelect(null)}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} />
      <RFControls />
    </ReactFlow>
  );
};
