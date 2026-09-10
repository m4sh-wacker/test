import { Fragment, useMemo, useState } from 'react';
import { Clock, GripVertical, Search, Star, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CATEGORY_ORDER, type OperationDef } from '../../engine';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';
import { Pane } from './Pane';

const FAVOURITES = 'Favourites';
const RECENT = 'Recent';

/** Groups that are yours rather than the catalogue's, in this order. */
const PERSONAL = [FAVOURITES, RECENT];

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
      <mark className="bg-transparent font-medium" style={{ color: 'var(--purple-text)' }}>
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

/**
 * A category heading, not a control.
 *
 * These used to be accordions, closed by default, so reaching an operation cost
 * a click to open the right one and a guess about which one that was. With five
 * hundred operations behind sixteen closed doors, the catalogue was a menu of
 * headings rather than a list of tools.
 *
 * Flat and scrolling, the headings become signposts you pass rather than gates
 * you open, and the search — which is how anyone with a specific operation in
 * mind actually finds it — is unobstructed.
 */
function CategoryHeading({ name, count }: { name: string; count: number }) {
  return (
    <h3
      className="sticky top-0 z-10 flex items-center gap-2 border-y border-line bg-surface-2 px-2 py-1"
      style={{ boxShadow: 'inset 2px 0 0 0 var(--purple-line)' }}
    >
      {name === RECENT && <Clock size={9} aria-hidden="true" className="shrink-0 text-faint" />}
      <span className="flex-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {name}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-faint">{count}</span>
    </h3>
  );
}

export function OperationsPane() {
  const operations = useStore((s) => s.operations);
  const favourites = useStore((s) => s.favourites);
  const recent = useStore((s) => s.recent);
  const addStep = useStore((s) => s.addStep);
  const [query, setQuery] = useState('');
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

    // Recent excludes anything already starred: the same name twice in two
    // lists at the top of the rail is noise, and the star is the stronger
    // signal of the two.
    const lately = recent
      .filter((id) => !favourites.includes(id))
      .map((id) => matched.find((op) => op.id === id))
      .filter((op): op is OperationDef => op !== undefined);
    if (lately.length > 0) byCategory.set(RECENT, lately);

    for (const op of matched) {
      const list = byCategory.get(op.category) ?? [];
      list.push(op);
      byCategory.set(op.category, list);
    }

    return [...byCategory.entries()].sort((a, b) => {
      const ai = PERSONAL.indexOf(a[0]);
      const bi = PERSONAL.indexOf(b[0]);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return (CATEGORY_ORDER.indexOf(a[0]) + 1 || 99) - (CATEGORY_ORDER.indexOf(b[0]) + 1 || 99);
    });
  }, [operations, favourites, recent, query]);

  /*
   * The top match, for Enter.
   *
   * Typing three characters and pressing Enter is how a person who knows what
   * they want uses a list of five hundred. Without it the keyboard gets you as
   * far as filtering and then hands you back to the mouse.
   */
  const topMatch = useMemo(() => {
    const q = query.trim();
    if (!q) return undefined;
    return grouped.find(([name]) => !PERSONAL.includes(name))?.[1][0];
  }, [grouped, query]);

  const total = grouped.reduce((n, [name, ops]) => n + (name === FAVOURITES ? 0 : ops.length), 0);
  const searching = query.trim().length > 0;

  return (
    <Pane
      title={t.operations.title}
      meta={
        <span className="font-mono text-micro tabular-nums text-faint">
          {searching ? t.operations.matches(total, operations.length) : operations.length}
        </span>
      }
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
            onKeyDown={(event) => {
              if (event.key === 'Enter' && topMatch) {
                event.preventDefault();
                addStep(topMatch.id);
              }
            }}
            placeholder={t.operations.search}
            aria-label={t.operations.search}
            aria-describedby="operation-search-hint"
            spellCheck={false}
            className="w-full rounded-control border border-line bg-surface-2 py-1.5 pe-14 ps-7 text-micro outline-none transition-colors duration-150 ease-smooth placeholder:text-faint focus:border-purple-line"
          />

          {/*
            The shortcut is written where the thing it opens is, because a
            shortcut nobody is told about is a shortcut nobody uses. It gives
            way to a clear button once there is something to clear.
          */}
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t.operations.clear}
              title={t.operations.clear}
              className="absolute inset-y-0 end-1.5 my-auto grid h-6 w-6 place-items-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-text"
            >
              <X size={12} aria-hidden="true" />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 end-2 my-auto flex h-[18px] items-center rounded border border-line px-1.5 font-mono text-[10px] text-faint"
            >
              {t.operations.shortcut}
            </kbd>
          )}
        </div>

        <p id="operation-search-hint" className="sr-only">
          {t.operations.searchHint}
        </p>

        {topMatch && (
          <p className="mt-1.5 truncate text-[10px] text-faint">
            {t.operations.enterAdds(topMatch.name)}
          </p>
        )}
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
              <CategoryHeading name={name} count={ops.length} />
              <ul>
                {ops.map((op) => (
                  <Row key={op.id} op={op} query={searching ? query.trim() : ''} />
                ))}
              </ul>
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
