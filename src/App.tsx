import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { t } from './i18n/en';
import { useAnalysis } from './hooks/useAnalysis';
import { useHotkeys } from './hooks/useHotkeys';
import { Header } from './components/layout/Header';
import { Workspace } from './components/layout/Workspace';
import { StatusBar } from './components/layout/StatusBar';
import { CtfView } from './components/ctf/CtfView';
import { HelpDialog } from './components/ui/HelpDialog';
import { ShareDialog } from './components/ui/ShareDialog';
import { RecipeLibrary } from './components/ui/RecipeLibrary';
import { DownloadDialog } from './components/ui/DownloadDialog';

export default function App() {
  const loadOperations = useStore((s) => s.loadOperations);
  const restoreFromUrl = useStore((s) => s.restoreFromUrl);
  const dialog = useStore((s) => s.dialog);
  const view = useStore((s) => s.view);

  useEffect(() => {
    void loadOperations().then(() => restoreFromUrl());
  }, [loadOperations, restoreFromUrl]);

  useAnalysis();
  useHotkeys();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/*
        Tab order follows the page, and the page puts five hundred operations in
        sixteen headings before it gets to the box you type in. Seventeen
        presses to reach the primary control is not a keyboard interface. This
        is the standard answer: invisible until focused, first in the order.
      */}
      <a
        href="#decodebox-input"
        className="sr-only rounded-control border border-purple-line bg-surface px-3 py-2 text-xs2 font-medium text-text focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50"
      >
        {t.layout.skipToInput}
      </a>
      <Header />
      {view === 'workspace' && <Workspace />}
      {view === 'ctf' && <CtfView />}
      <StatusBar />
      {dialog === 'help' && <HelpDialog />}
      {dialog === 'share' && <ShareDialog />}
      {dialog === 'library' && <RecipeLibrary />}
      {dialog === 'download' && <DownloadDialog />}
    </div>
  );
}
