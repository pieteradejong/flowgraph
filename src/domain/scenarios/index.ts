import { sampleGraph } from '../sampleGraph';
import type { Graph } from '../types';
import { dataCenter } from './dataCenter';
import { logistics } from './logistics';
import { satelliteNetwork } from './satelliteNetwork';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  graph: Graph;
}

const sampleScenario: Scenario = {
  id: 'sample',
  name: 'Sample',
  description: '5-node test fixture exercising every status band.',
  graph: sampleGraph,
};

const dataCenterScenario: Scenario = {
  id: 'data-center',
  name: 'Data Center',
  description: 'Three-tier web stack with database as the limiting tier.',
  graph: dataCenter,
};

const satelliteScenario: Scenario = {
  id: 'satellite-network',
  name: 'Satellite Network',
  description: 'Ground-to-orbit relay with constellation crossing as the bottleneck.',
  graph: satelliteNetwork,
};

const logisticsScenario: Scenario = {
  id: 'logistics',
  name: 'Logistics',
  description: 'Manufacturer-to-retail supply chain with asymmetric upstream load.',
  graph: logistics,
};

export const DEFAULT_SCENARIO: Scenario = sampleScenario;

export const SCENARIOS: readonly Scenario[] = [
  sampleScenario,
  dataCenterScenario,
  satelliteScenario,
  logisticsScenario,
];

export const getScenario = (id: string): Scenario =>
  SCENARIOS.find((s) => s.id === id) ?? DEFAULT_SCENARIO;
