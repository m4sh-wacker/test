import { ChevronDown, Sparkles, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { describeChain } from '../../engine';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';
import { ConfidenceBar } from '../ui/primitives';
import { LayerChain } from '../result/LayerChain';
import { WhyPanel } from '../result/WhyPanel';

/**
 * Detection, presented as a band across the top of the output rather than a
 * wand icon you have to know about.
 *
 * The difference matters: an analyst who does not already know what their data
 * is cannot search for the operation that would tell them. Putting the answer —
 * and the reasoning behind it — in their line of sight is the whole point of
 * this project.
 */
export function DetectionStrip() {
  const root = useStore((s) => s.root);
  const chain = useStore((s) => s.chain);
  const steps = useStore((s) => s.steps);
  const whyOpen = useStore((s) => s.whyOpen);
  const dismissed = useStore((s) => s.suggestionDismissed);
  const analysing = useStore((s) => s.analysing);
  const toggleWhy = useStore((s) => s.toggleWhy);
  const applySuggestion = useStore((s) => s.applySuggestion);
  const dismissSuggestion = useStore((s) => s.dismissSuggestion);

  const decoded = chain.slice(1);
  const evidenceLayer = decoded[decoded.length - 1];
  const terminus = chain[chain.length - 1]?.terminus;

  if (analysing && decoded.length === 0) {
    return (
      <div className="shrink-0 border-b border-line px-3 py-2 text-micro text-faint">
        {t.detection.analysing}
      </div>
    );
  }

  if (!root || decoded.length === 0 || dismissed) return null;

  const confidence = Math.min(...decoded.map((l) => l.confidence));
  const alreadyApplied = steps.length > 0;

  return (
    <div className="shrink-0 border-b border-line bg-surface">
      <div
        className={cx(
          'flex flex-wrap items-center gap-x-3 gap-y-2 border-s-2 px-3 py-2',
          'bg-purple-soft/40',
        )}
        style={{ borderInlineStartColor: 'var(--purple)' }}
      >
        <Sparkles size={13} aria-hidden="true" style={{ color: 'var(--purple)' }} />

        <span className="min-w-0 flex-1 text-xs2">
          <span className="text-faint">{t.detection.label} </span>
          <span className="font-mono font-medium text-text">{describeChain(root)}</span>
        </span>

        <span className="flex shrink-0 items-center gap-2 text-micro text-muted">
          <ConfidenceBar value={confidence} />
          {Math.round(confidence * 100)}%
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {!alreadyApplied && (
            <button
              type="button"
              onClick={applySuggestion}
              className="rounded-control border border-purple-line px-2.5 py-1 text-micro font-medium text-text transition-colors duration-150 ease-smooth hover:border-purple"
            >
              {t.detection.apply}
            </button>
          )}
          <button
            type="button"
            onClick={toggleWhy}
            aria-expanded={whyOpen}
            className="flex items-center gap-1 rounded-control px-2 py-1 text-micro text-muted transition-colors duration-150 ease-smooth hover:bg-surface-3 hover:text-text"
          >
            {t.detection.why}
            <ChevronDown
              size={11}
              aria-hidden="true"
              className={cx('transition-transform duration-200 ease-smooth', whyOpen && 'rotate-180')}
            />
          </button>
          <button
            type="button"
            onClick={dismissSuggestion}
            aria-label={t.detection.dismiss}
            title={t.detection.dismiss}
            className="rounded-control p-1 text-faint transition-colors duration-150 ease-smooth hover:bg-surface-3 hover:text-text"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto px-3 py-2">
        <LayerChain />
      </div>

      {/* Why the chain ends where it does. Suppressed only for the plain
          ending, where the layer chain has already said everything. */}
      {terminus && terminus.reason !== 'plain' && (
        <p
          className="px-3 pb-2 text-micro"
          style={{ color: terminus.complete ? 'var(--text-muted)' : 'var(--amber)' }}
        >
          {terminus.note}
        </p>
      )}

      {whyOpen && evidenceLayer && (
        <div className="border-t border-line p-3">
          <WhyPanel format={evidenceLayer.format} evidence={evidenceLayer.evidence} />
        </div>
      )}
    </div>
  );
}
