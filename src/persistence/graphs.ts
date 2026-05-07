import type { SupabaseClient } from '@supabase/supabase-js';
import type { Graph } from '../domain/types';
import { getClient } from './client';
import { fromPersisted, toPersisted, type PersistedGraph } from './serialize';

export interface GraphRow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VersionRow {
  id: string;
  graphId: string;
  version: number;
  message: string | null;
  createdAt: string;
}

class PersistenceError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = 'PersistenceError';
  }
}

/**
 * Resolve the configured client or throw. UI callers should check
 * `isPersistenceConfigured()` first and show the offline banner.
 */
const requireClient = async (): Promise<SupabaseClient> => {
  const client = await getClient();
  if (!client) throw new PersistenceError('Local Supabase is not configured or unreachable.');
  return client;
};

const requireUserId = async (client: SupabaseClient): Promise<string> => {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new PersistenceError('No authenticated user.', error);
  return data.user.id;
};

export const listGraphs = async (): Promise<GraphRow[]> => {
  const client = await requireClient();
  const { data, error } = await client
    .from('graphs')
    .select('id, name, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new PersistenceError('Failed to list graphs.', error);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
};

export const createGraph = async (
  name: string,
  graph: Graph,
  message?: string,
): Promise<{ graphId: string; version: number }> => {
  const client = await requireClient();
  const userId = await requireUserId(client);

  const { data: graphRow, error: graphErr } = await client
    .from('graphs')
    .insert({ name, user_id: userId })
    .select('id')
    .single();
  if (graphErr || !graphRow) throw new PersistenceError('Failed to create graph.', graphErr);

  const graphId = graphRow.id as string;
  const persisted = toPersisted(graph);
  const { error: versionErr } = await client
    .from('graph_versions')
    .insert({ graph_id: graphId, version: 1, data: persisted, message: message ?? null });
  if (versionErr) throw new PersistenceError('Failed to write initial version.', versionErr);

  return { graphId, version: 1 };
};

export const renameGraph = async (id: string, name: string): Promise<void> => {
  const client = await requireClient();
  const { error } = await client
    .from('graphs')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new PersistenceError('Failed to rename graph.', error);
};

export const deleteGraph = async (id: string): Promise<void> => {
  const client = await requireClient();
  const { error } = await client.from('graphs').delete().eq('id', id);
  if (error) throw new PersistenceError('Failed to delete graph.', error);
};

export const listVersions = async (graphId: string): Promise<VersionRow[]> => {
  const client = await requireClient();
  const { data, error } = await client
    .from('graph_versions')
    .select('id, graph_id, version, message, created_at')
    .eq('graph_id', graphId)
    .order('version', { ascending: false });
  if (error) throw new PersistenceError('Failed to list versions.', error);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    graphId: r.graph_id as string,
    version: r.version as number,
    message: (r.message as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
};

export const loadVersion = async (graphId: string, version?: number): Promise<Graph> => {
  const client = await requireClient();
  let query = client
    .from('graph_versions')
    .select('data, version')
    .eq('graph_id', graphId);
  query = version === undefined
    ? query.order('version', { ascending: false }).limit(1)
    : query.eq('version', version);

  const { data, error } = await query.maybeSingle();
  if (error) throw new PersistenceError('Failed to load version.', error);
  if (!data) throw new PersistenceError('Version not found.');
  return fromPersisted(data.data as PersistedGraph);
};

/**
 * Append a new immutable snapshot for an existing graph. The new version
 * number is `max(version) + 1`. Concurrent snapshots could collide on the
 * `unique(graph_id, version)` constraint; callers should retry once on
 * unique violation. Acceptable for single-user local use.
 */
export const saveSnapshot = async (
  graphId: string,
  graph: Graph,
  message?: string,
): Promise<number> => {
  const client = await requireClient();

  const { data: latest, error: latestErr } = await client
    .from('graph_versions')
    .select('version')
    .eq('graph_id', graphId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) throw new PersistenceError('Failed to read latest version.', latestErr);

  const nextVersion = ((latest?.version as number | undefined) ?? 0) + 1;
  const persisted = toPersisted(graph);

  const { error: insertErr } = await client
    .from('graph_versions')
    .insert({
      graph_id: graphId,
      version: nextVersion,
      data: persisted,
      message: message ?? null,
    });
  if (insertErr) throw new PersistenceError('Failed to write snapshot.', insertErr);

  await client
    .from('graphs')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', graphId);

  return nextVersion;
};
