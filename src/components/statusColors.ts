import type { EdgeStatus } from '../domain/types';

export const STATUS_COLORS: Record<EdgeStatus, string> = {
  healthy: '#22c55e',
  stressed: '#eab308',
  saturated: '#f97316',
  overloaded: '#ef4444',
};

export const STATUS_STROKE_WIDTH: Record<EdgeStatus, number> = {
  healthy: 2,
  stressed: 3,
  saturated: 4,
  overloaded: 5,
};

export const NODE_BACKGROUND: Record<'source' | 'processor' | 'sink', string> = {
  source: '#3b82f6',
  processor: '#475569',
  sink: '#1e293b',
};
