import type { Graph } from '../domain/types';

interface Props {
  graph: Graph;
  selectedId: string | null;
}

export const Inspector = ({ graph, selectedId }: Props) => {
  if (!selectedId) {
    return (
      <aside className="inspector inspector--empty">
        <h2>Inspector</h2>
        <p>Click a node or edge to inspect.</p>
      </aside>
    );
  }

  const node = graph.nodes.find((n) => n.id === selectedId);
  const edge = graph.edges.find((e) => e.id === selectedId);
  const target = node ?? edge;

  if (!target) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p>Selection no longer exists.</p>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <h2>{node ? 'Node' : 'Edge'}</h2>
      <dl>
        {Object.entries(target).map(([k, v]) => (
          <div key={k} className="inspector__row">
            <dt>{k}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
};
