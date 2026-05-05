import type { FlowEdge, Graph } from '../types';

const e = (
  id: string,
  source: string,
  target: string,
  capacity: number,
  latency = 1,
): FlowEdge => ({ id, source, target, capacity, latency, load: 0, status: 'healthy' });

/**
 * Ground-orbit-ground topology:
 *
 *   ground-1 ─┐                  ┌─→ sat-1 ─┐
 *             ├─→ uplink-relay ──┤          ├─→ downlink-relay → distribution
 *   ground-2 ─┘                  └─→ sat-2 ─┘
 *
 * The constellation crossing (uplink → satellites) is the limiting factor:
 * combined ground traffic exactly saturates the uplink, and aggregated downlink
 * traffic exceeds the distribution channel.
 */
export const satelliteNetwork: Graph = {
  nodes: [
    { id: 'ground-1', kind: 'source', label: 'Ground Station 1', rate: 80 },
    { id: 'ground-2', kind: 'source', label: 'Ground Station 2', rate: 120 },
    { id: 'uplink', kind: 'processor', label: 'Uplink Relay' },
    { id: 'sat-1', kind: 'processor', label: 'Satellite 1' },
    { id: 'sat-2', kind: 'processor', label: 'Satellite 2' },
    { id: 'downlink', kind: 'processor', label: 'Downlink Relay' },
    { id: 'distribution', kind: 'sink', label: 'Distribution' },
  ],
  edges: [
    e('sat-1', 'ground-1', 'uplink', 200, 2),
    e('sat-2', 'ground-2', 'uplink', 200, 2),
    e('sat-3', 'uplink', 'sat-1', 100, 4),
    e('sat-4', 'uplink', 'sat-2', 100, 4),
    e('sat-5', 'sat-1', 'downlink', 110, 4),
    e('sat-6', 'sat-2', 'downlink', 110, 4),
    e('sat-7', 'downlink', 'distribution', 180, 2),
  ],
};
