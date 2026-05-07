import type { VersionRow } from '../persistence/graphs';

interface Props {
  versions: VersionRow[];
  loading: boolean;
  error: string | null;
  onRestore: (version: number) => void;
}

export const VersionHistory = ({ versions, loading, error, onRestore }: Props) => (
  <section className="version-history">
    <h2>Versions</h2>
    {loading && <p className="version-history__hint">Loading…</p>}
    {error && <p className="version-history__error">{error}</p>}
    {!loading && !error && versions.length === 0 && (
      <p className="version-history__hint">No snapshots yet. Click Save to create one.</p>
    )}
    {versions.length > 0 && (
      <ol className="version-history__list">
        {versions.map((v, idx) => (
          <li key={v.id} className="version-history__row">
            <div className="version-history__meta">
              <strong>v{v.version}</strong>
              {idx === 0 && <span className="version-history__pill">latest</span>}
              <span className="version-history__time">{formatTime(v.createdAt)}</span>
            </div>
            {v.message && <p className="version-history__message">{v.message}</p>}
            <button
              type="button"
              className="version-history__restore"
              onClick={() => onRestore(v.version)}
            >
              Restore
            </button>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};
