import { useCallback, useState } from 'react';
import { Controls } from './components/Controls';
import { GraphCanvas } from './components/GraphCanvas';
import { Inspector } from './components/Inspector';
import { MetricsPanel } from './components/MetricsPanel';
import { randomizeRates } from './domain/randomize';
import { DEFAULT_SCENARIO, getScenario } from './domain/scenarios';
import { step } from './domain/simulation';
import type { Graph } from './domain/types';

export const App = () => {
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO.id);
  const [graph, setGraph] = useState<Graph>(DEFAULT_SCENARIO.graph);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleScenarioChange = useCallback((id: string) => {
    const scenario = getScenario(id);
    setScenarioId(scenario.id);
    setGraph(scenario.graph);
    setSelectedId(null);
  }, []);

  const handleStep = useCallback(() => setGraph((g) => step(g)), []);

  const handleReset = useCallback(() => {
    setGraph(getScenario(scenarioId).graph);
    setSelectedId(null);
  }, [scenarioId]);

  const handleRandomize = useCallback(
    () => setGraph((g) => step(randomizeRates(g, { minRate: 20, maxRate: 200 }))),
    [],
  );

  return (
    <div className="app">
      <Controls
        scenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        onStep={handleStep}
        onReset={handleReset}
        onRandomize={handleRandomize}
      />
      <main className="app__main">
        <div className="app__canvas">
          <GraphCanvas graph={graph} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <Inspector graph={graph} selectedId={selectedId} />
      </main>
      <MetricsPanel graph={graph} />
    </div>
  );
};
