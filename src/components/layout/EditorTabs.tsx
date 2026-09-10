import { X } from 'lucide-react';

/**
 * The tab strip above an editor pane.
 *
 * The filenames are the point. `recipe.yaml`, `input.txt`, `output.hex` say
 * what each surface holds in the vocabulary the audience already reads all day,
 * and they carry the one thing a pane title cannot: a dirty marker. A recipe
 * with unsaved steps is a modified buffer, and showing it as one is accurate
 * rather than decorative.
 *
 * Tabs here select a view within a fixed pane; they do not open and close
 * documents. Closing is therefore not offered on a pane's only tab — a close
 * button that cannot close anything is the kind of detail that breaks the
 * illusion rather than selling it.
 */

/** The coloured glyph VS Code puts before a filename, by extension. */
export function FileGlyph({ kind }: { kind: 'yaml' | 'txt' | 'hex' | 'json' }) {
  const { label, color } = {
    yaml: { label: 'Y', color: 'var(--red)' },
    json: { label: '{}', color: 'var(--amber)' },
    txt: { label: '≡', color: 'var(--text-faint)' },
    hex: { label: '0x', color: 'var(--blue)' },
  }[kind];

  return (
    <span
      aria-hidden="true"
      className="grid h-3.5 w-3.5 shrink-0 place-items-center font-mono text-[9px] font-bold leading-none"
      style={{ color }}
    >
      {label}
    </span>
  );
}

export type EditorTab = {
  id: string;
  name: string;
  kind: 'yaml' | 'txt' | 'hex' | 'json';
  /** Shown as the dot VS Code uses for an unsaved buffer. */
  dirty?: boolean;
  onClose?: () => void;
};

export function EditorTabs({
  tabs,
  active,
  onSelect,
  actions,
}: {
  tabs: EditorTab[];
  active: string;
  onSelect: (id: string) => void;
  /** Pane-level controls, which VS Code puts at the end of the tab strip. */
  actions?: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className="vs-tabstrip flex h-[35px] shrink-0 items-stretch border-b border-line"
    >
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <div
            key={tab.id}
            data-active={on}
            className="vs-tab group relative flex items-center gap-1.5 border-e border-line ps-3 pe-2"
          >
            {/* The active tab is marked along its top edge, as the editor does. */}
            {on && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[1px]"
                style={{ backgroundColor: 'var(--tab-active-line)' }}
              />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(tab.id)}
              className="flex items-center gap-1.5 py-1 font-mono text-[12px] leading-none"
            >
              <FileGlyph kind={tab.kind} />
              {tab.name}
            </button>

            {tab.dirty ? (
              <span
                aria-label="unsaved"
                title="unsaved changes"
                className="grid h-4 w-4 place-items-center"
              >
                <span
                  aria-hidden="true"
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: 'currentColor' }}
                />
              </span>
            ) : tab.onClose ? (
              <button
                type="button"
                onClick={tab.onClose}
                aria-label={`Close ${tab.name}`}
                title={`Close ${tab.name}`}
                className="grid h-4 w-4 place-items-center rounded-sm opacity-0 transition-opacity hover:bg-surface-3 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : (
              <span className="h-4 w-4" />
            )}
          </div>
        );
      })}

      {actions && <div className="ms-auto flex items-center gap-0.5 pe-1.5">{actions}</div>}
    </div>
  );
}
