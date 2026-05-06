import type { ChangeEvent } from 'react';
import type { FlowEdge, FlowNode, Graph, NodeKind } from '../domain/types';

interface Props {
  graph: Graph;
  selectedId: string | null;
  onUpdateNode: (id: string, patch: Partial<FlowNode>) => void;
  onUpdateEdge: (id: string, patch: Partial<FlowEdge>) => void;
  onDelete: (id: string) => void;
}

const NODE_KINDS: readonly NodeKind[] = ['source', 'processor', 'sink'];

const numberFromInput = (e: ChangeEvent<HTMLInputElement>): number => {
  const v = Number(e.target.value);
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

export const Inspector = ({ graph, selectedId, onUpdateNode, onUpdateEdge, onDelete }: Props) => {
  if (!selectedId) {
    return (
      <aside className="inspector inspector--empty">
        <h2>Inspector</h2>
        <p>Click a node or edge to inspect. Click empty canvas to deselect.</p>
      </aside>
    );
  }

  const node = graph.nodes.find((n) => n.id === selectedId);
  if (node) return <NodeInspector node={node} onUpdate={onUpdateNode} onDelete={onDelete} />;

  const edge = graph.edges.find((e) => e.id === selectedId);
  if (edge) return <EdgeInspector edge={edge} onUpdate={onUpdateEdge} onDelete={onDelete} />;

  return (
    <aside className="inspector">
      <h2>Inspector</h2>
      <p>Selection no longer exists.</p>
    </aside>
  );
};

interface NodeInspectorProps {
  node: FlowNode;
  onUpdate: (id: string, patch: Partial<FlowNode>) => void;
  onDelete: (id: string) => void;
}

const NodeInspector = ({ node, onUpdate, onDelete }: NodeInspectorProps) => (
  <aside className="inspector">
    <h2>Node</h2>
    <Field label="id">
      <span className="inspector__readonly">{node.id}</span>
    </Field>
    <Field label="kind">
      <select
        value={node.kind}
        onChange={(e) => onUpdate(node.id, { kind: e.target.value as NodeKind })}
      >
        {NODE_KINDS.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
    </Field>
    <Field label="label">
      <input
        type="text"
        value={node.label ?? ''}
        onChange={(e) => onUpdate(node.id, { label: e.target.value })}
      />
    </Field>
    {node.kind === 'source' && (
      <Field label="rate">
        <input
          type="number"
          min={0}
          value={node.rate ?? 0}
          onChange={(e) => onUpdate(node.id, { rate: numberFromInput(e) })}
        />
      </Field>
    )}
    <button type="button" className="inspector__delete" onClick={() => onDelete(node.id)}>
      Delete node
    </button>
  </aside>
);

interface EdgeInspectorProps {
  edge: FlowEdge;
  onUpdate: (id: string, patch: Partial<FlowEdge>) => void;
  onDelete: (id: string) => void;
}

const EdgeInspector = ({ edge, onUpdate, onDelete }: EdgeInspectorProps) => (
  <aside className="inspector">
    <h2>Edge</h2>
    <Field label="id"><span className="inspector__readonly">{edge.id}</span></Field>
    <Field label="source"><span className="inspector__readonly">{edge.source}</span></Field>
    <Field label="target"><span className="inspector__readonly">{edge.target}</span></Field>
    <Field label="capacity">
      <input
        type="number"
        min={0}
        value={edge.capacity}
        onChange={(e) => onUpdate(edge.id, { capacity: numberFromInput(e) })}
      />
    </Field>
    <Field label="latency">
      <input
        type="number"
        min={0}
        value={edge.latency}
        onChange={(e) => onUpdate(edge.id, { latency: numberFromInput(e) })}
      />
    </Field>
    <Field label="load"><span className="inspector__readonly">{edge.load.toFixed(2)}</span></Field>
    <Field label="status"><span className="inspector__readonly">{edge.status}</span></Field>
    <button type="button" className="inspector__delete" onClick={() => onDelete(edge.id)}>
      Delete edge
    </button>
  </aside>
);

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

const Field = ({ label, children }: FieldProps) => (
  <div className="inspector__field">
    <label>{label}</label>
    {children}
  </div>
);
