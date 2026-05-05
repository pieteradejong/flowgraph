interface Props {
  onStep: () => void;
  onReset: () => void;
  onRandomize: () => void;
}

export const Controls = ({ onStep, onReset, onRandomize }: Props) => (
  <header className="controls">
    <h1 className="controls__title">FlowGraph</h1>
    <div className="controls__buttons">
      <button type="button" onClick={onStep}>Step</button>
      <button type="button" onClick={onReset}>Reset</button>
      <button type="button" onClick={onRandomize}>Randomize</button>
    </div>
  </header>
);
