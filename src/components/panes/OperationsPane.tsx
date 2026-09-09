import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, GripVertical, Search, Star } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CATEGORY_ORDER, type OperationDef } from '../../engine';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';
import { Pane } from './Pane';

const FAVOURITES = 'Favourites';

function score(op: OperationDef, query: string): number {
  const q = query.toLowerCase();
  const name = op.name.toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (op.aliases.some((a) => a.toLowerCase().startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  if (op.aliases.some((a) => a.toLowerCase().includes(q))) return 4;
  if (op.description.toLowerCase().includes(q)) return 5;
  return -1;
}

/** Marks the matched run so the reason a result appeared is visible. */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-medium" style={{ color: 'var(--purple)' }}>
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}

function Row({ op, query }: { op: OperationDef; query: string }) {
  const addStep = useStore((s) => s.addStep);
  const favourites = useStore((s) => s.favourites);
  const toggleFavourite = useStore((s) => s.toggleFavourite);
  const starred = favourites.includes(op.id);

  // The matched alias is worth showing: it explains why "b64" found "From Base64".
  const alias =
    query && !op.name.toLowerCase().includes(query.toLowerCase())
      ? op.aliases.find((a) => a.toLowerCase().includes(query.toLowerCase()))
      : undefined;

  return (
    <li>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('application/x-decodebox-op', op.id);
          event.dataTransfer.effectAllowed = 'copy';
        }}
        className="group flex cursor-grab items-center gap-1 pe-1.5 transition-colors duration-100 ease-smooth hover:bg-surface-2 active:cursor-grabbing"
        title={op.description}
      >
        <GripVertical
          size={11}
          aria-hidden="true"
          className="ms-1 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
        />
        <button
          type="button"
          onClick={() => addStep(op.id)}
          className="flex min-w-0 flex-1 items-baseline gap-2 py-[5px] text-start"
        >
          <span
            className={cx(
              'truncate text-xs2 group-hover:text-text',
              op.isFlowControl ? 'italic text-faint' : 'text-muted',
            )}
          >
            <Highlight text={op.name} query={query} />
          </span>
          {alias && (
            <span className="shrink-0 truncate font-mono text-[10px] text-faint">
              <Highlight text={alias} query={query} />
            </span>
          )}
        </button>
        <button
          type="button"
          aria-label={starred ? t.operations.unstar(op.name) : t.operations.star(op.name)}
          aria-pressed={starred}
          onClick={() => toggleFavourite(op.id)}
          className={cx(
            'shrink-0 rounded p-1 transition-opacity',
            starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100',
          )}
        >
          <Star
            size={11}
            aria-hidden="true"
            style={starred ? { fill: 'var(--amber)', color: 'var(--amber)' } : undefined}
            className={starred ? undefined : 'text-faint'}
          />
        </button>
      </div>
    </li>
  );
}

function Category({
  name,
  ops,
  query,
  open,
  onToggle,
}: {
  name: string;
  ops: OperationDef[];
  query: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-1.5 border-s-2 bg-surface-2 px-2.5 py-1.5 text-start transition-colors duration-100 ease-smooth hover:bg-surface-3"
          style={{ borderInlineStartColor: open ? 'var(--purple)' : 'transparent' }}
        >
          <ChevronRight
            size={11}
            aria-hidden="true"
            className={cx(
              'shrink-0 text-faint transition-transform duration-150 ease-smooth',
              open && 'rotate-90',
            )}
          />
          <span className="flex-1 truncate font-mono text-micro uppercase tracking-[0.06em] text-muted">
            {name}
          </span>
          <span className="font-mono text-micro text-faint">{ops.length}</span>
        </button>
      </h3>
      {open && (
        <ul>
          {ops.map((op) => (
            <Row key={op.id} op={op} query={query} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function OperationsPane() {
  const operations = useStore((s) => s.operations);
  const favourites = useStore((s) => s.favourites);
  const [query, setQuery] = useState('');
  /*
   * Categories start closed, so the rail opens as a menu of sixteen headings
   * with counts rather than a single list of five hundred names.
   *
   * It used to start with everything expanded, which meant the first thing
   * anyone saw was an endless alphabetical scroll they had to read to use.
   * Favourites is the exception — it is short, it is yours, and it is the one
   * list worth having open. Searching expands everything again, because then
   * the names *are* the answer.
   */
  const [collapsed, setCollapsed] = useState<string[]>(() => [...CATEGORY_ORDER]);

  const grouped = useMemo(() => {
    const q = query.trim();
    const matched = q
      ? operations
          .map((op) => ({ op, rank: score(op, q) }))
          .filter((entry) => entry.rank >= 0)
          .sort((a, b) => a.rank - b.rank || a.op.name.localeCompare(b.op.name))
          .map((entry) => entry.op)
      : operations;

    const byCategory = new Map<string, OperationDef[]>();
    const starred = matched.filter((op) => favourites.includes(op.id));
    if (starred.length > 0) byCategory.set(FAVOURITES, starred);

    for (const op of matched) {
      const list = byCategory.get(op.category) ?? [];
      list.push(op);
      byCategory.set(op.category, list);
    }

    return [...byCategory.entries()].sort((a, b) => {
      if (a[0] === FAVOURITES) return -1;
      if (b[0] === FAVOURITES) return 1;
      return (CATEGORY_ORDER.indexOf(a[0]) + 1 || 99) - (CATEGORY_ORDER.indexOf(b[0]) + 1 || 99);
    });
  }, [operations, favourites, query]);

  const total = grouped.reduce((n, [name, ops]) => n + (name === FAVOURITES ? 0 : ops.length), 0);
  const searching = query.trim().length > 0;

  return (
    <Pane
      title={t.operations.title}
      meta={<span className="font-mono text-micro text-faint">{total}</span>}
    >
      <div className="shrink-0 border-b border-line bg-surface p-2">
        <div className="relative">
          <Search
            size={12}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.operations.search}
            aria-label={t.operations.search}
            spellCheck={false}
            className="w-full rounded-control border border-line bg-surface-2 py-1.5 pe-2.5 ps-7 text-micro outline-none transition-colors duration-150 ease-smooth placeholder:text-faint focus:border-purple-line"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          // Two different silences. The engine is a separate chunk now, so on a
          // slow connection this list is briefly empty for a reason that has
          // nothing to do with the search — and saying 'nothing matches' then
          // would be a lie about the tool rather than about the query.
          <p className="px-3 py-6 text-center text-micro text-faint">
            {operations.length === 0 ? t.operations.loading : t.operations.noResults}
          </p>
        ) : (
          grouped.map(([name, ops]) => (
            <Fragment key={name}>
              <Category
                name={name}
                ops={ops}
                query={searching ? query.trim() : ''}
                open={searching || !collapsed.includes(name)}
                onToggle={() =>
                  setCollapsed((c) =>
                    c.includes(name) ? c.filter((n) => n !== name) : [...c, name],
                  )
                }
              />
            </Fragment>
          ))
        )}
      </div>

      <p className="shrink-0 border-t border-line px-3 py-1.5 text-[10px] text-faint">
        {t.operations.hint}
      </p>
    </Pane>
  );
}
