import { useDeferredValue, useMemo, useState } from 'react';
import { CornerDownRight, Regex, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { findInLayers, isValidQuery } from '../../engine';
import type { LayerMatch } from '../../engine';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';

/**
 * Find a string in a payload that does not contain it yet.
 *
 * Nesting is what makes this worth having. A payload wrapped six times has
 * seven bodies of text, six of which do not exist until something decodes them,
 * and none of which the browser's own find-in-page can see. Without this the
 * work is manual — decode a layer, look, decode the next — which is the
 * drudgery the rest of this tool exists to remove.
 *
 * A hit is not the end of it. Every match carries the recipe that reaches its
 * layer, so "found `admin` three decodes down" comes with the button that puts
 * you there with the recipe loaded.
 */

function Hit({ match }: { match: LayerMatch }) {
  const openLayer = useStore((s) => s.openLayer);
  const reachable = match.steps.length > 0;

  return (
    <li className="rounded-control border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line px-2.5 py-1.5">
        <span
          className="rounded-chip px-1.5 py-px font-mono text-[10px] font-semibold"
          style={{ backgroundColor: 'var(--purple-soft)', color: 'var(--purple-text)' }}
        >
          {match.depth === 0 ? t.find.inInput : t.find.depth(match.depth)}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-micro text-faint">{match.path}</span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-faint">
          {t.find.at(match.offset)}
        </span>

        {reachable ? (
          <button
            type="button"
            onClick={() => openLayer(match.steps)}
            title={t.find.openHint}
            className="flex shrink-0 items-center gap-1 rounded-control border border-purple-line bg-purple-soft px-2 py-0.5 text-micro font-medium text-text transition-colors duration-150 ease-smooth hover:border-purple"
          >
            <CornerDownRight size={11} aria-hidden="true" />
            {t.find.open}
          </button>
        ) : (
          // A region found inside a parent cannot be expressed as a linear
          // recipe, so there is nowhere to send anyone. Say so rather than
          // offering a button that would lie.
          <span className="shrink-0 text-[10px] text-faint">{t.find.embedded}</span>
        )}
      </div>

      <p className="overflow-x-auto whitespace-pre px-2.5 py-2 font-mono text-micro text-muted">
        {match.before && <span className="text-faint">…{match.before}</span>}
        <mark
          className="rounded-[2px] px-0.5 font-semibold"
          style={{ backgroundColor: 'var(--purple-soft)', color: 'var(--purple-text)' }}
        >
          {match.match}
        </mark>
        {match.after && <span className="text-faint">{match.after}…</span>}
      </p>
    </li>
  );
}

export function LayerFind() {
  const analysis = useStore((s) => s.analysis);
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  /*
   * The search runs on the tree already in memory, so it is fast — but it runs
   * on every keystroke over every layer, and `useDeferredValue` is what keeps
   * the field itself responsive when a pattern is expensive.
   */
  const deferred = useDeferredValue(query);
  const valid = isValidQuery(deferred, regex);

  const matches = useMemo(() => {
    if (!analysis || deferred.trim().length === 0 || !valid) return [];
    return findInLayers(analysis.root, deferred, { regex, caseSensitive });
  }, [analysis, deferred, regex, caseSensitive, valid]);

  const layers = new Set(matches.map((m) => m.nodeId)).size;
  const searching = deferred.trim().length > 0;

  return (
    <section aria-label={t.find.region} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search
            size={13}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.find.placeholder}
            aria-label={t.find.placeholder}
            aria-invalid={!valid}
            spellCheck={false}
            className={cx(
              'w-full rounded-control border bg-surface-2 py-2 pe-8 ps-8 font-mono text-xs2',
              'outline-none transition-colors duration-150 ease-smooth placeholder:font-sans placeholder:text-faint',
              valid ? 'border-line focus:border-purple-line' : 'border-danger',
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t.find.clear}
              title={t.find.clear}
              className="absolute inset-y-0 end-1.5 my-auto grid h-6 w-6 place-items-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-text"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Toggle on={regex} onChange={setRegex} label={t.find.regex} title={t.find.regexHint}>
            <Regex size={13} aria-hidden="true" />
          </Toggle>
          <Toggle
            on={caseSensitive}
            onChange={setCaseSensitive}
            label={t.find.caseSensitive}
            title={t.find.caseHint}
          >
            <span aria-hidden="true" className="font-mono text-micro font-semibold">
              Aa
            </span>
          </Toggle>
        </div>
      </div>

      {searching && (
        <p
          role="status"
          className={cx('text-micro', valid ? 'text-muted' : 'text-danger')}
        >
          {!valid
            ? t.find.badPattern
            : matches.length === 0
              ? t.find.none
              : t.find.count(matches.length, layers)}
        </p>
      )}

      {matches.length > 0 && (
        <ul className="space-y-1.5">
          {matches.map((match, index) => (
            <Hit key={`${match.nodeId}-${match.offset}-${index}`} match={match} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Toggle({
  on,
  onChange,
  label,
  title,
  children,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={label}
      title={title}
      className={cx(
        'grid h-8 w-8 place-items-center rounded-control border transition-colors duration-150 ease-smooth',
        on
          ? 'border-purple-line bg-purple-soft text-text'
          : 'border-line text-faint hover:border-line-strong hover:text-muted',
      )}
    >
      {children}
    </button>
  );
}
