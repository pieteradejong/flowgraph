import { useCallback, useState } from 'react';
import { Controls } from './components/Controls';
import { GraphCanvas } from './components/GraphCanvas';
import { Inspector } from './components/Inspector';
import { MetricsPanel } from './components/MetricsPanel';
import { randomizeRates } from './domain/randomize';
import { sampleGraph } from './domain/sampleGraph';
import { step } from './domain/simulation';
import type { Graph } from './domain/types';

export const App = () => {
  const [graph, setGraph] = useState<Graph>(sampleGraph);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleStep = useCallback(() => setGraph((g) => step(g)), []);
  const handleReset = useCallback(() => {
    setGraph(sampleGraph);
    setSelectedId(null);
  }, []);
  const handleRandomize = useCallback(
    () => setGraph((g) => step(randomizeRates(g, { minRate: 20, maxRate: 200 }))),
    [],
  );

  return (
    <div className="app">
      <Controls onStep={handleStep} onReset={handleReset} onRandomize={handleRandomize} />
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
