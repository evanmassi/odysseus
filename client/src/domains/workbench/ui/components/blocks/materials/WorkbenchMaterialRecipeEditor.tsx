import { useState } from 'react';

import { X } from 'lucide-react';

import { Select, Tooltip } from '@shared/ui';

import { CONCENTRATION_UNITS } from '../../../../utils/materials/materialCatalog';
import { unitChoices } from '../../../../utils/values/valueUnits';

import type { RecipeLine } from '../../../../utils/materials/materialRecipe';

interface WorkbenchMaterialRecipeEditorProps {
  lines: readonly RecipeLine[];
  note: string;
  onAdd: (text: string) => void;
  onAmountChange: (entryId: string, amount: string) => void;
  onUnitChange: (entryId: string, unit: string) => void;
  onRemove: (entryId: string) => void;
  onNoteChange: (note: string) => void;
}

const FIELD =
  'border-b border-line-soft bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary';

export function WorkbenchMaterialRecipeEditor({
  lines,
  note,
  onAdd,
  onAmountChange,
  onUnitChange,
  onRemove,
  onNoteChange,
}: WorkbenchMaterialRecipeEditorProps) {
  const [draft, setDraft] = useState('');

  return (
    <div className="flex min-w-80 flex-col gap-1.5 whitespace-normal py-1">
      {lines.map(({ entry, ingredient }) => (
        <div key={entry.id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate">
            {ingredient ? (
              ingredient.name.trim()
            ) : (
              <span className="italic text-muted-foreground">no longer in Materials</span>
            )}
          </span>
          <input
            value={entry.amount}
            placeholder="0"
            aria-label={`Amount of ${ingredient?.name ?? 'ingredient'} in the mix`}
            className={`${FIELD} w-16 text-right font-mono`}
            onChange={event => onAmountChange(entry.id, event.target.value)}
          />
          <Select
            size="xs"
            isQuiet
            value={entry.unit}
            options={unitChoices(CONCENTRATION_UNITS)}
            aria-label="Unit"
            className="w-24"
            onChange={unit => onUnitChange(entry.id, String(unit ?? ''))}
          />
          <Tooltip content="Take it out of the recipe">
            <button
              type="button"
              aria-label={`Take ${ingredient?.name ?? 'this ingredient'} out of the recipe`}
              className="text-muted-foreground hover:text-danger-text"
              onClick={() => onRemove(entry.id)}
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      ))}
      <input
        value={draft}
        placeholder="Add an ingredient: IL-6 20 µg/mL"
        aria-label="Add an ingredient"
        spellCheck={false}
        autoComplete="off"
        className={FIELD}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key !== 'Enter' || !draft.trim()) return;
          event.preventDefault();
          onAdd(draft);
          setDraft('');
        }}
      />
      <input
        value={note}
        placeholder="Note (optional)"
        aria-label="Recipe note"
        className={`${FIELD} text-muted-foreground`}
        onChange={event => onNoteChange(event.target.value)}
      />
    </div>
  );
}
