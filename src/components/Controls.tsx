import { SCENARIOS } from '../domain/scenarios';

interface Props {
  scenarioId: string;
  onScenarioChange: (id: string) => void;
  onStep: () => void;
  onReset: () => void;
  onRandomize: () => void;
}

export const Controls = ({ scenarioId, onScenarioChange, onStep, onReset, onRandomize }: Props) => (
  <header className="controls">
    <h1 className="controls__title">FlowGraph</h1>
    <label className="controls__scenario">
      <span>Scenario</span>
      <select value={scenarioId} onChange={(e) => onScenarioChange(e.target.value)}>
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
    <div className="controls__buttons">
      <button type="button" onClick={onStep}>Step</button>
      <button type="button" onClick={onReset}>Reset</button>
      <button type="button" onClick={onRandomize}>Randomize</button>
    </div>
  </header>
);
