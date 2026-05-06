import { SCENARIOS } from '../domain/scenarios';
import type { NodeKind } from '../domain/types';

interface Props {
  scenarioId: string;
  onScenarioChange: (id: string) => void;
  onStep: () => void;
  onReset: () => void;
  onRandomize: () => void;
  onAddNode: (kind: NodeKind) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

export const Controls = ({
  scenarioId,
  onScenarioChange,
  onStep,
  onReset,
  onRandomize,
  onAddNode,
  playing,
  onTogglePlay,
}: Props) => (
  <header className="controls">
    <h1 className="controls__title">FlowGraph</h1>
    <label className="controls__scenario">
      <span>Scenario</span>
      <select value={scenarioId} onChange={(e) => onScenarioChange(e.target.value)}>
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
        <option value="blank">Blank</option>
      </select>
    </label>
    <div className="controls__group">
      <span className="controls__group-label">Add</span>
      <button type="button" onClick={() => onAddNode('source')}>Source</button>
      <button type="button" onClick={() => onAddNode('processor')}>Processor</button>
      <button type="button" onClick={() => onAddNode('sink')}>Sink</button>
    </div>
    <div className="controls__buttons">
      <button
        type="button"
        onClick={onTogglePlay}
        className={playing ? 'controls__play controls__play--on' : 'controls__play'}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={onStep} disabled={playing}>Step</button>
      <button type="button" onClick={onReset}>Reset</button>
      <button type="button" onClick={onRandomize} disabled={playing}>Randomize</button>
    </div>
  </header>
);
