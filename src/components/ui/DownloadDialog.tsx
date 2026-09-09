import { Download } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { Dialog } from './Dialog';

/**
 * What you are getting, before you get it.
 *
 * A bare download link would be shorter, but a single 1 MB HTML file that
 * happens to be a whole application is an unusual thing to be handed, and two
 * of its properties matter enough to state before the click rather than after:
 * it makes no network requests at all, and it will never update itself.
 *
 * The link is a plain anchor with `download`, pointing at a file the build
 * writes next to the site. No fetch, no blob, nothing for `connect-src 'none'`
 * to block — the same policy that makes the claim above true.
 */
export function DownloadDialog() {
  const setDialog = useStore((s) => s.setDialog);

  return (
    <Dialog title={t.download.title} closeLabel={t.common.close} onClose={() => setDialog(null)}>
      <div className="space-y-3 text-xs2 leading-relaxed text-muted">
        <p className="text-text">{t.download.lead}</p>
        <p>{t.download.privacy}</p>
        <p>{t.download.airgap}</p>
        <p style={{ color: 'var(--amber)' }}>{t.download.stale}</p>
        <p className="text-faint">{t.download.worker}</p>
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-line pt-3 font-mono text-micro">
        <div className="flex justify-between gap-4">
          <dt className="text-faint">{t.download.version}</dt>
          <dd className="text-muted">{__APP_VERSION__}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-faint">{t.download.built}</dt>
          <dd className="text-muted">{__BUILD_TIME__}</dd>
        </div>
      </dl>

      <a
        href="./decodebox.html"
        download="decodebox.html"
        className="mt-4 flex items-center justify-center gap-2 rounded-control border border-purple-line bg-purple-soft px-3 py-2 text-xs2 font-medium text-text transition-colors duration-150 ease-smooth hover:border-purple"
      >
        <Download size={14} aria-hidden="true" />
        {t.download.button}
        <span className="font-mono text-micro text-faint">({t.download.size})</span>
      </a>
    </Dialog>
  );
}
