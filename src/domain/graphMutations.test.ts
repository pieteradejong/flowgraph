import { describe, expect, it } from 'vitest';
import {
  createEdge,
  createNode,
  emptyGraph,
  nextEdgeId,
  nextNodeId,
  removeEdge,
  removeNode,
  updateEdge,
  updateNode,
} from './graphMutations';
import { sampleGraph } from './sampleGraph';
import type { Graph } from './types';

const snapshot = (g: Graph) => structuredClone(g);

describe('id generation', () => {
  it('nextNodeId returns node-1 for an empty graph', () => {
    expect(nextNodeId(emptyGraph)).toBe('node-1');
  });

  it('nextNodeId skips taken ids', () => {
    const g: Graph = { nodes: [{ id: 'node-1', kind: 'processor' }], edges: [] };
    expect(nextNodeId(g)).toBe('node-2');
  });

  it('nextEdgeId returns edge-1 for an empty graph', () => {
    expect(nextEdgeId(emptyGraph)).toBe('edge-1');
  });
});

describe('createNode', () => {
  it('appends a processor with sensible defaults', () => {
    const g = createNode(emptyGraph, 'processor');
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0]).toMatchObject({ id: 'node-1', kind: 'processor', label: 'node-1' });
    expect(g.nodes[0]?.rate).toBeUndefined();
  });

  it('gives sources a default rate', () => {
    const g = createNode(emptyGraph, 'source');
    expect(g.nodes[0]?.rate).toBeGreaterThan(0);
  });

  it('does not mutate input', () => {
    const before = snapshot(sampleGraph);
    createNode(sampleGraph, 'processor');
    expect(sampleGraph).toEqual(before);
  });
});

describe('createEdge', () => {
  it('appends an edge with defaults between existing nodes', () => {
    const g: Graph = {
      nodes: [
        { id: 'a', kind: 'source', rate: 10 },
        { id: 'b', kind: 'sink' },
      ],
      edges: [],
    };
    const result = createEdge(g, 'a', 'b');
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      source: 'a',
      target: 'b',
      capacity: expect.any(Number),
      latency: expect.any(Number),
      load: 0,
      status: 'healthy',
    });
  });

  it('rejects self-loops', () => {
    const g: Graph = { nodes: [{ id: 'a', kind: 'processor' }], edges: [] };
    expect(() => createEdge(g, 'a', 'a')).toThrow(/self-loop/);
  });

  it('rejects unknown source', () => {
    const g: Graph = { nodes: [{ id: 'a', kind: 'processor' }], edges: [] };
    expect(() => createEdge(g, 'ghost', 'a')).toThrow(/unknown source/);
  });

  it('rejects unknown target', () => {
    const g: Graph = { nodes: [{ id: 'a', kind: 'processor' }], edges: [] };
    expect(() => createEdge(g, 'a', 'ghost')).toThrow(/unknown target/);
  });

  it('does not mutate input', () => {
    const before = snapshot(sampleGraph);
    createEdge(sampleGraph, 'src', 'sink');
    expect(sampleGraph).toEqual(before);
  });
});

describe('removeNode', () => {
  it('removes the node and all incident edges', () => {
    const g = removeNode(sampleGraph, 'ingress');
    expect(g.nodes.find((n) => n.id === 'ingress')).toBeUndefined();
    expect(g.edges.some((e) => e.source === 'ingress' || e.target === 'ingress')).toBe(false);
  });

  it('is a no-op for unknown ids', () => {
    expect(removeNode(sampleGraph, 'ghost')).toEqual(sampleGraph);
  });

  it('does not mutate input', () => {
    const before = snapshot(sampleGraph);
    removeNode(sampleGraph, 'ingress');
    expect(sampleGraph).toEqual(before);
  });
});

describe('removeEdge', () => {
  it('removes only the named edge', () => {
    const g = removeEdge(sampleGraph, 'e3');
    expect(g.edges.find((e) => e.id === 'e3')).toBeUndefined();
    expect(g.edges).toHaveLength(sampleGraph.edges.length - 1);
    expect(g.nodes).toEqual(sampleGraph.nodes);
  });
});

describe('updateNode', () => {
  it('patches arbitrary fields but never the id', () => {
    const g = updateNode(sampleGraph, 'src', { label: 'New Source', id: 'attempted-rename' });
    const node = g.nodes.find((n) => n.id === 'src');
    expect(node?.label).toBe('New Source');
    expect(g.nodes.find((n) => n.id === 'attempted-rename')).toBeUndefined();
  });

  it('drops rate when kind changes away from source', () => {
    const g = updateNode(sampleGraph, 'src', { kind: 'processor' });
    const node = g.nodes.find((n) => n.id === 'src');
    expect(node?.kind).toBe('processor');
    expect(node?.rate).toBeUndefined();
  });

  it('does not mutate input', () => {
    const before = snapshot(sampleGraph);
    updateNode(sampleGraph, 'src', { label: 'x' });
    expect(sampleGraph).toEqual(before);
  });
});

describe('updateEdge', () => {
  it('patches capacity and latency', () => {
    const g = updateEdge(sampleGraph, 'e1', { capacity: 999, latency: 5 });
    const edge = g.edges.find((e) => e.id === 'e1');
    expect(edge?.capacity).toBe(999);
    expect(edge?.latency).toBe(5);
  });

  it('does not allow rerouting via patch', () => {
    const g = updateEdge(sampleGraph, 'e1', {
      source: 'attempted',
      target: 'attempted',
      id: 'attempted',
    });
    const edge = g.edges.find((e) => e.id === 'e1');
    expect(edge?.source).toBe('src');
    expect(edge?.target).toBe('ingress');
  });
});
