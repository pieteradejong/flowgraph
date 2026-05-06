import { computeMetrics } from '../domain/metrics';
import type { Graph } from '../domain/types';
import { STATUS_COLORS } from './statusColors';

interface Props {
  graph: Graph;
}

export const MetricsPanel = ({ graph }: Props) => {
  const m = computeMetrics(graph);
  return (
    <footer className="metrics">
      <div className="metrics__group">
        <span className="metrics__label">Source emission</span>
        <span className="metrics__value">{m.sourceEmission.toFixed(0)}</span>
      </div>
      <div className="metrics__group">
        <span className="metrics__label">Sink throughput</span>
        <span className="metrics__value">{m.sinkThroughput.toFixed(1)}</span>
      </div>
      <div className="metrics__group">
        <span className="metrics__label">Avg utilization</span>
        <span className="metrics__value">{(m.averageUtilization * 100).toFixed(0)}%</span>
      </div>
      <div className="metrics__group">
        <span className="metrics__label">Max utilization</span>
        <span className="metrics__value">{(m.maxUtilization * 100).toFixed(0)}%</span>
      </div>
      <div className="metrics__group metrics__group--statuses">
        {(['healthy', 'stressed', 'saturated', 'overloaded', 'down'] as const).map((s) => (
          <span key={s} className="metrics__status">
            <span className="metrics__swatch" style={{ background: STATUS_COLORS[s] }} />
            {s}: {m.statusCounts[s]}
          </span>
        ))}
      </div>
      <div className="metrics__group">
        <span className="metrics__label">Bottlenecks</span>
        <span className="metrics__value">
          {m.bottleneckEdgeIds.length === 0 ? 'none' : m.bottleneckEdgeIds.join(', ')}
        </span>
      </div>
    </footer>
  );
};
