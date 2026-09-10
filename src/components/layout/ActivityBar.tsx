import type { LucideIcon } from 'lucide-react';
import { Files, Flag, HelpCircle, Link2, Save, Search, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';

/**
 * The activity bar: the far-left rail of icons that chooses what the sidebar
 * shows.
 *
 * Two rules borrowed from the editor it imitates. The bar stays dark in every
 * theme — it is chrome, not content, and VS Code's own light themes keep it
 * dark for exactly that reason. And the active item is marked by a bar down its
 * leading edge rather than a filled background, which is what lets a 48px rail
 * carry a selection without shouting.
 *
 * Every icon here opens something that exists. A rail of decorative glyphs
 * would sell the illusion for about four seconds — until the first click.
 */

type Item = {
  id: string;
  icon: LucideIcon;
  label: string;
  /** Runs instead of selecting a sidebar view, for the ones that are actions. */
  action?: () => void;
};

function Button({
  item,
  active,
  onSelect,
}: {
  item: Item;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={item.action ?? onSelect}
      aria-label={item.label}
      aria-pressed={item.action ? undefined : active}
      title={item.label}
      data-active={active}
      className="vs-activity-item relative grid h-12 w-12 shrink-0 place-items-center transition-colors duration-100"
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-[2px]"
          style={{ backgroundColor: 'var(--activity-active-line)' }}
        />
      )}
      <Icon size={22} strokeWidth={1.4} aria-hidden="true" />
    </button>
  );
}

export function ActivityBar() {
  const sidebar = useStore((s) => s.sidebar);
  const setSidebar = useStore((s) => s.setSidebar);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const focusSearch = useStore((s) => s.focusSearch);
  const setDialog = useStore((s) => s.setDialog);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  const views: Item[] = [
    { id: 'operations', icon: Files, label: t.activity.operations },
    {
      id: 'search',
      icon: Search,
      label: t.activity.search,
      action: () => {
        setSidebar('operations');
        setSidebarOpen(true);
        focusSearch();
      },
    },
    { id: 'detection', icon: SlidersHorizontal, label: t.activity.detection },
    {
      id: 'recipes',
      icon: Save,
      label: t.activity.recipes,
      action: () => setDialog('library'),
    },
    {
      id: 'ctf',
      icon: Flag,
      label: t.activity.ctf,
      action: () => setView(view === 'ctf' ? 'workspace' : 'ctf'),
    },
  ];

  const bottom: Item[] = [
    { id: 'share', icon: Link2, label: t.activity.share, action: () => setDialog('share') },
    { id: 'help', icon: HelpCircle, label: t.activity.help, action: () => setDialog('help') },
  ];

  return (
    <nav
      aria-label={t.activity.title}
      className="vs-activity flex w-12 shrink-0 flex-col justify-between"
    >
      <div className="flex flex-col">
        {views.map((item) => (
          <Button
            key={item.id}
            item={item}
            active={!item.action && sidebarOpen && sidebar === item.id}
            onSelect={() => {
              // Clicking the open view closes the sidebar, which is how the
              // editor gives you the whole window back without a second control.
              if (sidebar === item.id && sidebarOpen) setSidebarOpen(false);
              else {
                setSidebar(item.id as 'operations' | 'detection');
                setSidebarOpen(true);
              }
            }}
          />
        ))}
      </div>

      <div className="flex flex-col">
        {bottom.map((item) => (
          <Button key={item.id} item={item} active={false} onSelect={() => undefined} />
        ))}
      </div>
    </nav>
  );
}
