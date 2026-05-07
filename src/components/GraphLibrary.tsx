import { useEffect, useState } from 'react';
import type { GraphRow } from '../persistence/graphs';

interface Props {
  open: boolean;
  graphs: GraphRow[];
  loading: boolean;
  error: string | null;
  currentGraphId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSaveAsNew: (name: string) => void;
}

export const GraphLibrary = ({
  open,
  graphs,
  loading,
  error,
  currentGraphId,
  onClose,
  onOpen,
  onRename,
  onDelete,
  onSaveAsNew,
}: Props) => {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!open) setNewName('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Graph library</h2>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </header>

        <section className="modal__section">
          <h3>Save current as new</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = newName.trim();
              if (!trimmed) return;
              onSaveAsNew(trimmed);
              setNewName('');
            }}
            className="modal__form"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. data-center-v2)"
            />
            <button type="submit" disabled={!newName.trim()}>Create</button>
          </form>
        </section>

        <section className="modal__section">
          <h3>Open</h3>
          {loading && <p className="modal__hint">Loading…</p>}
          {error && <p className="modal__error">{error}</p>}
          {!loading && !error && graphs.length === 0 && (
            <p className="modal__hint">No saved graphs yet. Use "Save as…" above.</p>
          )}
          {graphs.length > 0 && (
            <ul className="modal__list">
              {graphs.map((g) => (
                <GraphRowView
                  key={g.id}
                  row={g}
                  isCurrent={g.id === currentGraphId}
                  onOpen={() => onOpen(g.id)}
                  onRename={(name) => onRename(g.id, name)}
                  onDelete={() => onDelete(g.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

interface RowProps {
  row: GraphRow;
  isCurrent: boolean;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

const GraphRowView = ({ row, isCurrent, onOpen, onRename, onDelete }: RowProps) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(row.name);

  return (
    <li className={isCurrent ? 'modal__row modal__row--current' : 'modal__row'}>
      {editing ? (
        <form
          className="modal__row-edit"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = draftName.trim();
            if (trimmed && trimmed !== row.name) onRename(trimmed);
            setEditing(false);
          }}
        >
          <input
            type="text"
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
          <button type="submit">Save</button>
          <button type="button" onClick={() => { setDraftName(row.name); setEditing(false); }}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <div className="modal__row-info">
            <strong>{row.name}</strong>
            <span className="modal__row-meta">
              {isCurrent ? 'open · ' : ''}updated {formatTime(row.updatedAt)}
            </span>
          </div>
          <div className="modal__row-actions">
            <button type="button" onClick={onOpen} disabled={isCurrent}>Open</button>
            <button type="button" onClick={() => setEditing(true)}>Rename</button>
            <button
              type="button"
              className="modal__row-delete"
              onClick={() => {
                if (confirm(`Delete "${row.name}" and all its versions?`)) onDelete();
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
};

const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};
