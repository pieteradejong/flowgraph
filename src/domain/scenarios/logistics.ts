import type { FlowEdge, Graph } from '../types';

const e = (
  id: string,
  source: string,
  target: string,
  capacity: number,
  latency = 1,
): FlowEdge => ({ id, source, target, capacity, latency, load: 0, status: 'healthy' });

/**
 * Manufacturing-to-retail supply chain:
 *
 *   mfg-1 ─┐                        ┌─→ regional-east → {retail-1, retail-2}
 *          ├─→ cross-dock ──────────┤
 *   mfg-2 ─┘                        └─→ regional-west → {retail-3, retail-4}
 *
 * Asymmetric manufacturer output (60 vs 80) stresses the cross-dock; regional
 * DCs split unevenly to retail outlets, leaving the western leg overloaded.
 */
export const logistics: Graph = {
  nodes: [
    { id: 'mfg-1', kind: 'source', label: 'Manufacturer 1', rate: 60 },
    { id: 'mfg-2', kind: 'source', label: 'Manufacturer 2', rate: 80 },
    { id: 'cross-dock', kind: 'processor', label: 'Cross-Dock' },
    { id: 'regional-east', kind: 'processor', label: 'Regional DC East' },
    { id: 'regional-west', kind: 'processor', label: 'Regional DC West' },
    { id: 'retail-1', kind: 'sink', label: 'Retail 1' },
    { id: 'retail-2', kind: 'sink', label: 'Retail 2' },
    { id: 'retail-3', kind: 'sink', label: 'Retail 3' },
    { id: 'retail-4', kind: 'sink', label: 'Retail 4' },
  ],
  edges: [
    e('lg-1', 'mfg-1', 'cross-dock', 100, 2),
    e('lg-2', 'mfg-2', 'cross-dock', 100, 2),
    e('lg-3', 'cross-dock', 'regional-east', 80, 3),
    e('lg-4', 'cross-dock', 'regional-west', 80, 3),
    e('lg-5', 'regional-east', 'retail-1', 40, 1),
    e('lg-6', 'regional-east', 'retail-2', 30, 1),
    e('lg-7', 'regional-west', 'retail-3', 35, 1),
    e('lg-8', 'regional-west', 'retail-4', 30, 1),
  ],
};
