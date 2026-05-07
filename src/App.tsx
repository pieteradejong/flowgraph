import { useCallback, useEffect, useState } from 'react';
import { Controls } from './components/Controls';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphLibrary } from './components/GraphLibrary';
import { Inspector } from './components/Inspector';
import { MetricsPanel } from './components/MetricsPanel';
import { VersionHistory } from './components/VersionHistory';
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
import { isPersistenceConfigured } from './persistence/client';
import {
  createGraph,
  deleteGraph,
  listGraphs,
  listVersions,
  loadVersion,
  renameGraph,
  saveSnapshot,
  type GraphRow,
  type VersionRow,
} from './persistence/graphs';

const BLANK_SCENARIO_ID = 'blank';
const PLAY_INTERVAL_MS = 600;

const initialGraphFor = (id: string): Graph =>
  id === BLANK_SCENARIO_ID ? emptyGraph : getScenario(id).graph;

export const App = () => {
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO.id);
  const [graph, setGraph] = useState<Graph>(DEFAULT_SCENARIO.graph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const persistenceAvailable = isPersistenceConfigured();
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null);
  const [savedGraphs, setSavedGraphs] = useState<GraphRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);

  const currentGraphName = savedGraphs.find((g) => g.id === currentGraphId)?.name ?? null;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setGraph((g) => step(g)), PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing]);

  const refreshLibrary = useCallback(async () => {
    if (!persistenceAvailable) return;
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      setSavedGraphs(await listGraphs());
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : String(err));
    } finally {
      setLibraryLoading(false);
    }
  }, [persistenceAvailable]);

  const refreshVersions = useCallback(async (graphId: string | null) => {
    if (!graphId) {
      setVersions([]);
      return;
    }
    setVersionsLoading(true);
    setVersionsError(null);
    try {
      setVersions(await listVersions(graphId));
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : String(err));
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (persistenceAvailable) void refreshLibrary();
  }, [persistenceAvailable, refreshLibrary]);

  useEffect(() => {
    void refreshVersions(currentGraphId);
  }, [currentGraphId, refreshVersions]);

  const handleScenarioChange = useCallback((id: string) => {
    setScenarioId(id);
    setGraph(initialGraphFor(id));
    setSelectedId(null);
    setPlaying(false);
    setCurrentGraphId(null);
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

  const handleSnapshot = useCallback(async () => {
    if (!currentGraphId) return;
    try {
      await saveSnapshot(currentGraphId, graph);
      await Promise.all([refreshVersions(currentGraphId), refreshLibrary()]);
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : String(err));
    }
  }, [currentGraphId, graph, refreshLibrary, refreshVersions]);

  const handleSaveAsNew = useCallback(
    async (name: string) => {
      try {
        const { graphId } = await createGraph(name, graph);
        setCurrentGraphId(graphId);
        setLibraryOpen(false);
        await refreshLibrary();
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : String(err));
      }
    },
    [graph, refreshLibrary],
  );

  const handleOpenGraph = useCallback(
    async (id: string) => {
      try {
        const loaded = await loadVersion(id);
        setGraph(loaded);
        setCurrentGraphId(id);
        setSelectedId(null);
        setPlaying(false);
        setLibraryOpen(false);
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : String(err));
      }
    },
    [],
  );

  const handleRenameGraph = useCallback(
    async (id: string, name: string) => {
      try {
        await renameGraph(id, name);
        await refreshLibrary();
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : String(err));
      }
    },
    [refreshLibrary],
  );

  const handleDeleteGraph = useCallback(
    async (id: string) => {
      try {
        await deleteGraph(id);
        if (currentGraphId === id) setCurrentGraphId(null);
        await refreshLibrary();
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : String(err));
      }
    },
    [currentGraphId, refreshLibrary],
  );

  const handleRestoreVersion = useCallback(
    async (version: number) => {
      if (!currentGraphId) return;
      try {
        const restored = await loadVersion(currentGraphId, version);
        setGraph(restored);
        setSelectedId(null);
        setPlaying(false);
      } catch (err) {
        setVersionsError(err instanceof Error ? err.message : String(err));
      }
    },
    [currentGraphId],
  );

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
        persistenceAvailable={persistenceAvailable}
        currentGraphName={currentGraphName}
        canSnapshot={Boolean(currentGraphId)}
        onSnapshot={() => void handleSnapshot()}
        onOpenLibrary={() => setLibraryOpen(true)}
      />
      {!persistenceAvailable && (
        <div className="banner banner--warn">
          Local Supabase not configured. Run <code>./scripts/db.sh start</code> and copy
          the <code>API URL</code> + <code>anon key</code> into <code>.env.local</code> to enable Save / Open.
        </div>
      )}
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
        <div className="app__sidebar">
          <Inspector
            graph={graph}
            selectedId={selectedId}
            onUpdateNode={handleUpdateNode}
            onUpdateEdge={handleUpdateEdge}
            onDelete={handleDelete}
          />
          {persistenceAvailable && currentGraphId && (
            <VersionHistory
              versions={versions}
              loading={versionsLoading}
              error={versionsError}
              onRestore={(v) => void handleRestoreVersion(v)}
            />
          )}
        </div>
      </main>
      <MetricsPanel graph={graph} />
      <GraphLibrary
        open={libraryOpen}
        graphs={savedGraphs}
        loading={libraryLoading}
        error={libraryError}
        currentGraphId={currentGraphId}
        onClose={() => setLibraryOpen(false)}
        onOpen={(id) => void handleOpenGraph(id)}
        onRename={(id, name) => void handleRenameGraph(id, name)}
        onDelete={(id) => void handleDeleteGraph(id)}
        onSaveAsNew={(name) => void handleSaveAsNew(name)}
      />
    </div>
  );
};
