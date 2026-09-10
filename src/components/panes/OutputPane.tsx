import { useState } from 'react';
import { ArrowUp, Check, Copy, Download, Maximize2, Minimize2, WrapText } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fileSignatureOf, formatBytes, imageMimeOf, renderText } from '../../engine';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';
import { IconButton } from '../ui/primitives';
import { JsonView } from '../result/JsonView';
import { DetectionStrip } from './DetectionStrip';
import { HashBand } from './HashBand';
import { Pane } from './Pane';

function isJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function OutputPane() {
  const steps = useStore((s) => s.steps);
  const result = useStore((s) => s.bakeResult);
  const chain = useStore((s) => s.chain);
  const activeLayerId = useStore((s) => s.activeLayerId);
  const setInput = useStore((s) => s.setInput);
  const pausedAt = useStore((s) => s.pausedAt);
  const maximised = useStore((s) => s.outputMaximised);
  const setMaximised = useStore((s) => s.setOutputMaximised);

  const [wrap, setWrap] = useState(true);
  const [copied, setCopied] = useState(false);

  // With a recipe, the output is what the recipe produced. Without one, it is
  // what detection unwrapped — so the pane is useful before the user has built
  // anything, which is the point of the tool.
  const activeLayer = chain.find((l) => l.id === activeLayerId) ?? chain[chain.length - 1];
  const output = steps.length > 0 ? (result?.output ?? '') : (activeLayer?.output ?? '');
  const source = steps.length > 0 ? 'recipe' : 'detection';

  // The engine deals in bytes; this is the one place they become text.
  // Reading them any earlier is what makes a gzip header render as U+FFFD.
  const shown = renderText(output);

  // Either a data: URI, or raw picture bytes an operation produced — the pane
  // builds the URI itself in the second case, so image operations chain into
  // one another without a step whose only job is to make them visible.
  const dataUri = /^data:image\/[a-z0-9.+-]+;base64,/i.test(shown.trim());
  const rawImage = dataUri ? null : imageMimeOf(output);
  const isImage = dataUri || rawImage !== null;
  const imageSource = dataUri
    ? shown.trim()
    : rawImage
      ? `data:${rawImage};base64,${btoa(output)}`
      : '';
  const json = !isImage && isJson(shown);
  const pretty = json ? JSON.stringify(JSON.parse(shown.trim()), null, 2) : shown;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard denied; the text is still selectable */
    }
  };

  const download = () => {
    // Written as the bytes the recipe produced, not as text. A downloaded PNG
    // that has been through a UTF-8 encoder is not a PNG any more.
    const bytes = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) bytes[i] = output.charCodeAt(i) & 0xff;

    // Named from what the bytes actually are. Decoding a Base64 picture and
    // being handed 'decodebox-output.txt' means renaming it by hand before
    // anything will open it, which is a silly last step for a tool that knew
    // perfectly well it had just produced a PNG.
    const signature = fileSignatureOf(output);
    const extension = signature ? signature.extension : json ? 'json' : 'txt';

    const blob = new Blob([bytes], { type: signature?.mime ?? 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decodebox-output.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Pane
      title={t.output.title}
      step={3}
      meta={
        output.length > 0 && (
          <>
            <span className="font-mono text-micro text-faint">
              {isImage ? 'image' : json ? 'json' : 'text'}
            </span>
            <span className="font-mono text-micro text-faint">{formatBytes(output.length)}</span>
            {!isImage && (
              <span className="font-mono text-micro text-faint">
                {t.status.lines(shown.split('\n').length)}
              </span>
            )}
            {pausedAt !== null && (
              <span className="font-mono text-micro" style={{ color: 'var(--amber)' }}>
                {t.output.paused}
              </span>
            )}
            {source === 'detection' && (
              <span className="font-mono text-micro" style={{ color: 'var(--purple-text)' }}>
                {t.output.fromDetection}
              </span>
            )}
          </>
        )
      }
      actions={
        <>
          <IconButton
            label={maximised ? t.output.restore : t.output.maximise}
            onClick={() => setMaximised(!maximised)}
            className="max-md:hidden"
          >
            {maximised ? (
              <Minimize2 size={13} aria-hidden="true" />
            ) : (
              <Maximize2 size={13} aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            label={t.output.wrap}
            onClick={() => setWrap((w) => !w)}
            className={wrap ? 'text-text' : undefined}
          >
            <WrapText size={13} aria-hidden="true" />
          </IconButton>
          <IconButton
            label={t.output.toInput}
            onClick={() => setInput(output)}
            disabled={output.length === 0}
          >
            <ArrowUp size={13} aria-hidden="true" />
          </IconButton>
          <IconButton
            label={copied ? t.output.copied : t.output.copy}
            onClick={copy}
            disabled={output.length === 0}
          >
            {copied ? (
              <Check size={13} aria-hidden="true" style={{ color: 'var(--green)' }} />
            ) : (
              <Copy size={13} aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            label={t.output.download}
            onClick={download}
            disabled={output.length === 0}
          >
            <Download size={13} aria-hidden="true" />
          </IconButton>
        </>
      }
    >
      <HashBand />
      <DetectionStrip />

      {result?.error && (
        <div
          className="shrink-0 border-b border-line px-3 py-2 font-mono text-micro"
          style={{ color: 'var(--red)' }}
        >
          {t.recipe.stepFailed(result.error.stepIndex + 1)}: {result.error.message}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {output.length === 0 ? null : isImage ? (
          // Rendered from a data: URI, which the CSP permits for images and
          // nothing else. SVG never reaches here — the operation refuses it,
          // because SVG is markup that can carry script.
          <div className="flex min-h-full flex-col items-center justify-center gap-3 p-4">
            <img
              src={imageSource}
              alt={t.output.imageAlt}
              className="max-h-full max-w-full rounded-control border border-line object-contain"
              style={{ imageRendering: 'auto' }}
            />
            <p className="font-mono text-micro text-faint">{t.output.imageNote}</p>
          </div>
        ) : (
          <pre
            className={cx(
              'p-3 font-mono text-[0.875rem] leading-[1.75]',
              wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre',
            )}
          >
            {json ? <JsonView source={pretty} /> : pretty}
          </pre>
        )}
      </div>
    </Pane>
  );
}
