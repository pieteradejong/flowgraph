import { useCallback, useEffect, useState } from 'react';
import { Controls } from './components/Controls';
import { GraphCanvas } from './components/GraphCanvas';
import { Inspector } from './components/Inspector';
import { MetricsPanel } from './components/MetricsPanel';
import {
  createEdge,
  createNode,
  emptyGraph,
  removeEdge,
  removeNode,
  updateEdge,
  updateNode,
} from './domain/graphMutations';
import { randomizeRates } from './domain/randomize';
import { DEFAULT_SCENARIO, getScenario } from './domain/scenarios';
import { step } from './domain/simulation';
import type { FlowEdge, FlowNode, Graph, NodeKind } from './domain/types';

const BLANK_SCENARIO_ID = 'blank';
const PLAY_INTERVAL_MS = 600;

const initialGraphFor = (id: string): Graph =>
  id === BLANK_SCENARIO_ID ? emptyGraph : getScenario(id).graph;

export const App = () => {
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO.id);
  const [graph, setGraph] = useState<Graph>(DEFAULT_SCENARIO.graph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setGraph((g) => step(g)), PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing]);

  const handleScenarioChange = useCallback((id: string) => {
    setScenarioId(id);
    setGraph(initialGraphFor(id));
    setSelectedId(null);
    setPlaying(false);
  }, []);

  const handleStep = useCallback(() => setGraph((g) => step(g)), []);

  const handleReset = useCallback(() => {
    setGraph(initialGraphFor(scenarioId));
    setSelectedId(null);
    setPlaying(false);
  }, [scenarioId]);

  const handleRandomize = useCallback(
    () => setGraph((g) => step(randomizeRates(g, { minRate: 20, maxRate: 200 }))),
    [],
  );

  const handleAddNode = useCallback((kind: NodeKind) => {
    setGraph((g) => createNode(g, kind));
  }, []);

  const handleConnect = useCallback((source: string, target: string) => {
    setGraph((g) => {
      try {
        return createEdge(g, source, target);
      } catch {
        return g;
      }
    });
  }, []);

  const handleUpdateNode = useCallback((id: string, patch: Partial<FlowNode>) => {
    setGraph((g) => updateNode(g, id, patch));
  }, []);

  const handleUpdateEdge = useCallback((id: string, patch: Partial<FlowEdge>) => {
    setGraph((g) => updateEdge(g, id, patch));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setGraph((g) => {
      const isNode = g.nodes.some((n) => n.id === id);
      return isNode ? removeNode(g, id) : removeEdge(g, id);
    });
    setSelectedId(null);
  }, []);

  const handleTogglePlay = useCallback(() => setPlaying((p) => !p), []);

  return (
    <div className="app">
      <Controls
        scenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        onStep={handleStep}
        onReset={handleReset}
        onRandomize={handleRandomize}
        onAddNode={handleAddNode}
        playing={playing}
        onTogglePlay={handleTogglePlay}
      />
      <main className="app__main">
        <div className="app__canvas">
          <GraphCanvas
            graph={graph}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onConnect={handleConnect}
            onDelete={handleDelete}
          />
        </div>
        <Inspector
          graph={graph}
          selectedId={selectedId}
          onUpdateNode={handleUpdateNode}
          onUpdateEdge={handleUpdateEdge}
          onDelete={handleDelete}
        />
      </main>
      <MetricsPanel graph={graph} />
    </div>
  );
};
