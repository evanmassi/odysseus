import { memo, useRef, useState, type CSSProperties } from 'react';

import { withGreekLetters, type SavedTerm } from '@odysseus/shared-schemas';

import { Button, DropdownMenu, MenuItem, Tooltip } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { usageTitle } from '../../../../utils/formulas/nameUsage';
import { displayValue, isUnreadableAmount } from '../../../../utils/formulas/quantities';
import { type KindChoice } from '../../../../utils/terms/savedTerms';
import { withPerLabwareKind } from '../../../../utils/terms/termLookup';
import { wellTooltipContent } from '../plateMap/wellTooltipContent';

import { NEEDED_TEXT } from './valueTableStyles';
import { WorkbenchValueAmountField } from './WorkbenchValueAmountField';

export type ValueItemField = 'name' | 'value';

export interface ValueRowData {
  id: string;
  label: string;
  fullName: string;
  value: string;
  unit: string;
  isNameTaken: boolean;
  usage: string;
  neededNote: string;
  term: SavedTerm | undefined;
  kindTag: string;
  kindNote: string;
  kindChoices: readonly KindChoice[];
}

export interface GeneralValueActions {
  onEdit: (itemId: string, cell: ValueItemField | undefined) => void;
  onMoveEdit: (itemId: string, cell: ValueItemField, step: 1 | -1) => void;
  onRename: (itemId: string, name: string) => void;
  onValueChange: (itemId: string, value: string) => void;
  onUnitChange: (itemId: string, unit: string) => void;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string, targetKey: string) => void;
  onKind: (itemId: string, term: SavedTerm | undefined) => void;
}

export interface ValueMoveTarget {
  key: string;
  label: string;
}

interface WorkbenchValueItemProps {
  row: ValueRowData;
  editingCell: ValueItemField | undefined;
  actions: GeneralValueActions;
  moveTargets?: readonly ValueMoveTarget[];
}

const CELL = 'px-2 py-1.5 align-middle';
const KIND_TAG = 'ml-2 border border-border px-1 text-label-xs text-muted-foreground';

const isSameKind = (a: SavedTerm | undefined, b: SavedTerm) =>
  a?.key === b.key && a.noun === b.noun && !a.of;

function kindChoiceNote(choice: KindChoice, term: SavedTerm | undefined): string | undefined {
  if (isSameKind(term, choice.term)) return 'this one';
  return choice.heldBy ? `now on ${choice.heldBy}` : undefined;
}

export const WorkbenchValueItem = memo(function WorkbenchValueItem({
  row,
  editingCell,
  actions,
  moveTargets = [],
}: WorkbenchValueItemProps) {
  const moveRef = useRef<HTMLSpanElement>(null);
  const kindRef = useRef<HTMLSpanElement>(null);
  const [moveMenuAt, setMoveMenuAt] = useState<CSSProperties>();
  const [kindMenuAt, setKindMenuAt] = useState<CSSProperties>();
  const isInvalid = isUnreadableAmount(row.value, row.unit);
  const usage = usageTitle(row.usage);
  const notes = [row.neededNote, row.kindNote].filter(Boolean);
  const title = notes.length ? wellTooltipContent([usage, ...notes]) : usage;
  const menuBelow = (ref: React.RefObject<HTMLSpanElement>, isOpen: boolean) => {
    const trigger = ref.current?.getBoundingClientRect();
    return !isOpen && trigger ? { left: trigger.left, top: trigger.bottom + 4 } : undefined;
  };

  const handleKeyDown = (cell: ValueItemField) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      actions.onEdit(row.id, undefined);
    } else if (event.key === 'Tab' && (event.target as HTMLElement).tagName === 'INPUT') {
      const inputs = [...(event.currentTarget as HTMLElement).querySelectorAll('input')];
      const at = inputs.indexOf(event.target as HTMLInputElement);
      const isEdge = event.shiftKey ? at <= 0 : at >= inputs.length - 1;
      if (!isEdge) return;
      event.preventDefault();
      actions.onMoveEdit(row.id, cell, event.shiftKey ? -1 : 1);
    }
  };

  const leave = useFocusLeave(() => actions.onEdit(row.id, undefined));

  return (
    <Tooltip content={title}>
      <tr
        className={`group ${ROW_HOVER_GLOW.primary} even:bg-[hsl(var(--foreground)/var(--alpha-zebra))] ${row.isNameTaken || row.kindNote || isInvalid ? 'text-danger-text' : ''}`}
      >
        <td
          className={CELL}
          onKeyDown={handleKeyDown('name')}
          onBlur={leave.onBlur}
          onFocus={leave.onFocus}
        >
          {editingCell === 'name' ? (
            <input
              ref={focusOnMount}
              defaultValue={row.label}
              placeholder="Name"
              aria-label="Value name"
              spellCheck={false}
              className="inline-edit-field text-body-sm text-foreground"
              onChange={event => actions.onRename(row.id, event.target.value)}
              onBlur={event => {
                const converted = withGreekLetters(event.target.value);
                if (converted !== event.target.value) actions.onRename(row.id, converted);
              }}
            />
          ) : (
            <button
              type="button"
              className="inline-edit text-left text-body-sm text-foreground"
              onClick={() => actions.onEdit(row.id, 'name')}
            >
              {row.label || <span className="text-muted-foreground">Unnamed</span>}
              {row.kindTag && <span className={KIND_TAG}>{row.kindTag}</span>}
              {!row.usage && (
                <span className="ml-2 text-label-xs text-muted-foreground/70">unused</span>
              )}
            </button>
          )}
        </td>
        <td
          className={`${CELL} text-right`}
          onKeyDown={handleKeyDown('value')}
          onBlur={leave.onBlur}
          onFocus={leave.onFocus}
        >
          {editingCell === 'value' ? (
            <WorkbenchValueAmountField
              value={row.value}
              unit={row.unit}
              placeholder="0"
              isFocusedOnMount
              isInvalid={isInvalid}
              onValueChange={value => actions.onValueChange(row.id, value)}
              onUnitChange={unit => actions.onUnitChange(row.id, unit)}
            />
          ) : (
            <button
              type="button"
              data-align="end"
              className="inline-edit font-mono text-data-sm"
              onClick={() => actions.onEdit(row.id, 'value')}
            >
              {row.value.trim() ? (
                withPerLabwareKind(displayValue(row.value, row.unit), row.fullName)
              ) : row.neededNote ? (
                <span className={NEEDED_TEXT}>needed</span>
              ) : (
                <span className="font-sans text-label-xs text-muted-foreground">to fill in</span>
              )}
            </button>
          )}
        </td>
        <td className="w-px whitespace-nowrap px-1 text-right">
          {moveTargets.length > 0 && (
            <span ref={moveRef} className="inline-flex">
              <Button
                variant="ghost"
                size="xs"
                className={moveMenuAt ? '' : 'opacity-0 group-hover:opacity-100'}
                aria-haspopup="menu"
                aria-expanded={!!moveMenuAt}
                onClick={() => setMoveMenuAt(menuBelow(moveRef, !!moveMenuAt))}
              >
                Move to…
              </Button>
              <DropdownMenu
                isOpen={!!moveMenuAt}
                onClose={() => setMoveMenuAt(undefined)}
                triggerRef={moveRef}
                portal
                align="start"
                aria-label="Move to"
                className="min-w-48 py-1"
                style={moveMenuAt}
              >
                {moveTargets.map(target => (
                  <MenuItem
                    key={target.key}
                    label={target.label}
                    onClick={() => {
                      setMoveMenuAt(undefined);
                      actions.onMove(row.id, target.key);
                    }}
                  />
                ))}
              </DropdownMenu>
            </span>
          )}
          <span ref={kindRef} className="inline-flex">
            <Button
              variant="ghost"
              size="xs"
              className={kindMenuAt ? '' : 'opacity-0 group-hover:opacity-100'}
              aria-haspopup="menu"
              aria-expanded={!!kindMenuAt}
              onClick={() => setKindMenuAt(menuBelow(kindRef, !!kindMenuAt))}
            >
              This is…
            </Button>
            <DropdownMenu
              isOpen={!!kindMenuAt}
              onClose={() => setKindMenuAt(undefined)}
              triggerRef={kindRef}
              portal
              align="start"
              aria-label="This is"
              className="min-w-48 py-1"
              style={kindMenuAt}
            >
              {row.kindChoices.map(choice => (
                <MenuItem
                  key={`${choice.term.key}:${choice.term.noun ?? ''}`}
                  label={choice.label}
                  description={kindChoiceNote(choice, row.term)}
                  disabled={isSameKind(row.term, choice.term)}
                  onClick={() => {
                    setKindMenuAt(undefined);
                    actions.onKind(row.id, choice.term);
                  }}
                />
              ))}
              {row.kindTag && (
                <MenuItem
                  label="None"
                  description="the math doesn't read it"
                  onClick={() => {
                    setKindMenuAt(undefined);
                    actions.onKind(row.id, undefined);
                  }}
                />
              )}
            </DropdownMenu>
          </span>
          <Button
            variant="ghost-danger"
            size="xs"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => actions.onRemove(row.id)}
          >
            Remove
          </Button>
        </td>
      </tr>
    </Tooltip>
  );
});
