import type { RefObject } from 'react';

import { Check, Plus } from 'lucide-react';

import { DropdownMenu, Input, ScrollArea } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import {
  searchFieldChoices,
  type FieldChoice,
} from '../../../../utils/materials/materialSectionFields';

interface WorkbenchMaterialFieldSelectorProps {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement>;
  choices: readonly FieldChoice[];
  query: string;
  onQueryChange: (query: string) => void;
  onToggle: (key: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

const CHOICE_ROW =
  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-body-sm text-foreground/75 transition-colors hover:bg-[linear-gradient(90deg,hsl(var(--primary)/0.18),transparent)] hover:text-foreground';
const CHECK_BOX = 'flex h-4 w-4 flex-none items-center justify-center border';

export function WorkbenchMaterialFieldSelector({
  isOpen,
  triggerRef,
  choices,
  query,
  onQueryChange,
  onToggle,
  onAddCustom,
  onClose,
}: WorkbenchMaterialFieldSelectorProps) {
  const { visible, enterChoice, canAddCustom } = searchFieldChoices(choices, query);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Home' || event.key === 'End') event.stopPropagation();
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (enterChoice) {
      onQueryChange('');
      onToggle(enterChoice.definition.key);
    } else if (canAddCustom) {
      onAddCustom();
    }
  };

  return (
    <DropdownMenu
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      align="end"
      aria-label="Fields"
      className="top-9 w-64 normal-case tracking-normal"
    >
      <div className="px-2 pb-1.5 pt-0.5">
        <Input
          size="xs"
          fullWidth
          ref={focusOnMount}
          value={query}
          placeholder="Find or name a field"
          aria-label="Find or name a field"
          spellCheck={false}
          autoComplete="off"
          onValueChange={onQueryChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      <ScrollArea className="max-h-64">
        {visible.map(({ definition, isShown }) => (
          <button
            key={definition.key}
            type="button"
            className={`${CHOICE_ROW} ${isShown ? 'text-foreground' : ''}`}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onToggle(definition.key)}
          >
            <span
              className={`${CHECK_BOX} ${isShown ? 'border-primary bg-primary/70 text-background' : 'border-line-mid'}`}
            >
              {isShown && <Check aria-hidden className="h-3 w-3" />}
            </span>
            {definition.label}
          </button>
        ))}
        {canAddCustom && (
          <button
            type="button"
            className={CHOICE_ROW}
            onMouseDown={event => event.preventDefault()}
            onClick={onAddCustom}
          >
            <span className={`${CHECK_BOX} border-dashed border-line-mid`}>
              <Plus aria-hidden className="h-3 w-3" />
            </span>
            Add “{query.trim()}” as a field
          </button>
        )}
      </ScrollArea>
    </DropdownMenu>
  );
}
