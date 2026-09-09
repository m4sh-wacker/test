import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { useAnalysis } from './hooks/useAnalysis';
import { useHotkeys } from './hooks/useHotkeys';
import { Header } from './components/layout/Header';
import { Workspace } from './components/layout/Workspace';
import { StatusBar } from './components/layout/StatusBar';
import { ReportView } from './components/report/ReportView';
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
      <Header />
      {view === 'workspace' && <Workspace />}
      {view === 'report' && <ReportView />}
      {view === 'ctf' && <CtfView />}
      <StatusBar />
      {dialog === 'help' && <HelpDialog />}
      {dialog === 'share' && <ShareDialog />}
      {dialog === 'library' && <RecipeLibrary />}
      {dialog === 'download' && <DownloadDialog />}
    </div>
  );
}
