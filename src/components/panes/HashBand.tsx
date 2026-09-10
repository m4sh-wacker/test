import { Fingerprint } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { confidenceColor } from '../ui/helpers';

/**
 * What the input *is*, when it is not something that can be decoded.
 *
 * Paste a digest into a decoding tool and the usual outcome is silence, or
 * sixteen bytes of hex-decoded noise. Neither tells the analyst the one thing
 * they need: this is one-way, here is which algorithm, stop looking for a
 * decode button.
 */
export function HashBand() {
  const identification = useStore((s) => s.identification);
  // A chain longer than the input node means decoding got somewhere, and this
  // band is for the case where it did not. Five layers of Base64 unwrapped to
  // 'mmd' is the answer; "looks like MD5, 45%" sitting above it is a guess
  // about the wrapper that the wrapper itself has already disproved. The
  // terminus names whatever is genuinely at the bottom, and does it there.
  const decoded = useStore((s) => s.chain.length > 1);
  if (decoded) return null;
  if (!identification || identification.matches.length === 0) return null;

  const [best, ...rest] = identification.matches;
  if (!best) return null;

  return (
    <div className="shrink-0 border-b border-line bg-surface">
      <div
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-s-2 px-3 py-2"
        style={{ borderInlineStartColor: 'var(--purple)' }}
      >
        <Fingerprint
          size={13}
          aria-hidden="true"
          className="translate-y-0.5"
          style={{ color: 'var(--purple-text)' }}
        />

        <span className="text-xs2">
          <span className="text-faint">{t.hash.label} </span>
          <span className="font-mono font-medium text-text">{best.name}</span>
        </span>

        <span
          className="font-mono text-micro"
          style={{ color: confidenceColor(best.confidence) }}
        >
          {Math.round(best.confidence * 100)}%
        </span>

        {/*
          Salted or not is the first question anyone holding a hash has: an
          unsalted digest may simply be in a lookup table and a salted one never
          is. It was being computed and not shown.
        */}
        {best.salt && (
          <span
            title={best.salt.note}
            className="rounded-chip px-1.5 py-px font-mono text-[10px] uppercase tracking-wider"
            style={
              best.salt.present
                ? { backgroundColor: 'var(--purple-soft)', color: 'var(--purple-text)' }
                : { backgroundColor: 'var(--amber-wash)', color: 'var(--amber)' }
            }
          >
            {best.salt.present ? t.hash.salted : t.hash.unsalted}
          </span>
        )}

        {best.salt?.value && (
          <span className="font-mono text-micro text-muted">
            {t.hash.saltIs}{' '}
            <code className="rounded-chip bg-surface-2 px-1 text-text">{best.salt.value}</code>
          </span>
        )}

        <span className="font-mono text-micro text-faint">{identification.summary}</span>
      </div>

      <div className="space-y-1.5 px-3 pb-2.5">
        {best.context && <p className="text-micro text-muted">{best.context}</p>}
        <p className="text-micro text-faint">{best.reason}.</p>

        {rest.length > 0 && (
          <p className="text-micro text-muted">
            <span className="text-faint">{t.hash.alsoPossible}: </span>
            {rest.map((match, i) => (
              <span key={match.name}>
                {i > 0 && <span className="text-faint"> · </span>}
                <span title={match.reason}>
                  <span className="font-mono">{match.name}</span>{' '}
                  <span className="font-mono text-faint">
                    {Math.round(match.confidence * 100)}%
                  </span>
                </span>
              </span>
            ))}
          </p>
        )}

        {identification.oneWay && (
          <p className="text-micro" style={{ color: 'var(--amber)' }}>
            {t.hash.oneWay}
          </p>
        )}
      </div>
    </div>
  );
}
