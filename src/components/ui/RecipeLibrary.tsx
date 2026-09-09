import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { Button, IconButton } from './primitives';
import { Dialog } from './Dialog';

export function RecipeLibrary() {
  const steps = useStore((s) => s.steps);
  const saved = useStore((s) => s.savedRecipes);
  const operations = useStore((s) => s.operations);
  const saveCurrentRecipe = useStore((s) => s.saveCurrentRecipe);
  const loadSavedRecipe = useStore((s) => s.loadSavedRecipe);
  const removeSavedRecipe = useStore((s) => s.removeSavedRecipe);
  const setDialog = useStore((s) => s.setDialog);

  const [name, setName] = useState('');

  const save = () => {
    if (steps.length === 0) return;
    saveCurrentRecipe(name);
    setName('');
  };

  const describe = (opIds: string[]) =>
    opIds
      .map((id) => operations.find((o) => o.id === id)?.name ?? id)
      .join(' → ');

  return (
    <Dialog
      title={t.library.title}
      subtitle={t.library.subtitle}
      closeLabel={t.common.close}
      onClose={() => setDialog(null)}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.library.namePlaceholder}
          aria-label={t.library.namePlaceholder}
          maxLength={80}
          className="min-w-0 flex-1 rounded-control border border-line bg-surface-2 px-2.5 py-1.5 text-xs2 outline-none transition-colors duration-150 focus:border-purple-line"
        />
        <Button type="submit" variant="primary" disabled={steps.length === 0}>
          {t.library.save}
        </Button>
      </form>

      {steps.length === 0 && <p className="mt-2 text-micro text-faint">{t.library.nothingToSave}</p>}

      <div className="mt-4">
        <h3 className="mb-2 font-mono text-micro uppercase tracking-wider text-faint">
          {t.library.saved} {saved.length > 0 && <span>({saved.length})</span>}
        </h3>

        {saved.length === 0 ? (
          <p className="rounded-control border border-dashed border-line px-3 py-5 text-center text-micro text-faint">
            {t.library.empty}
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {saved.map((recipe) => (
              <li key={recipe.id}>
                <div className="group flex items-center gap-1 rounded-control border border-line transition-colors duration-150 hover:border-purple-line">
                  <button
                    type="button"
                    onClick={() => loadSavedRecipe(recipe.id)}
                    className="min-w-0 flex-1 px-2.5 py-1.5 text-start"
                  >
                    <span className="block truncate text-xs2">{recipe.name}</span>
                    <span className="block truncate font-mono text-[10px] text-faint">
                      {describe(recipe.steps.map((s) => s.opId))}
                    </span>
                  </button>
                  <IconButton
                    label={t.library.remove(recipe.name)}
                    onClick={() => removeSavedRecipe(recipe.id)}
                    className="h-7 w-7 shrink-0"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-micro text-faint">{t.library.storageNote}</p>
    </Dialog>
  );
}
