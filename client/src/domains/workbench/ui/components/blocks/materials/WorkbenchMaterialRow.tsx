import { useEffect, useRef, type ReactNode } from 'react';

import { Button, Tooltip } from '@shared/ui';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { usageSummary, type NameUsage } from '../../../../utils/formulas/nameUsage';
import { displayValue } from '../../../../utils/formulas/quantities';
import { materialFields } from '../../../../utils/materials/materialCatalog';
import { CONJUGATE_FIELD } from '../../../../utils/materials/materialClashes';
import {
  RECIPE_FIELD,
  UNSORTED_GROUP,
  materialText,
} from '../../../../utils/materials/materialItems';
import { localToday } from '../../../../utils/protocolFile/experimentId';

import {
  MATERIAL_ACTIONS_CELL,
  MATERIAL_CELL,
  MATERIAL_MUTED,
  MATERIAL_NAME,
  MATERIAL_WARNING_TEXT,
  ROW_ACTION,
  materialRowClass,
} from './materialTableStyles';
import { isSameCell, type MaterialCell, type MaterialCellEditing } from './useMaterialCellEditing';
import { WorkbenchMaterialCellField } from './WorkbenchMaterialCellField';
import { WorkbenchMaterialKindSelector } from './WorkbenchMaterialKindSelector';
import { WorkbenchMaterialRecipeEditor } from './WorkbenchMaterialRecipeEditor';

import type { MaterialKind } from './materialSelectOptions';
import type { RecipeLine } from '../../../../utils/materials/materialRecipe';
import type { FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

export interface MaterialRowActions {
  rename: (itemId: string, name: string) => void;
  writeField: (itemId: string, definition: FieldDefinition, value: string) => void;
  setUnit: (itemId: string, key: string, unit: string) => void;
  chooseKind: (itemId: string, kind: MaterialKind) => void;
  requestNewGroup: (itemId: string) => void;
  fillDown: (item: MaterialItem, source: MaterialItem, key: string) => void;
  suggest: (itemId: string, key: string, typed: string) => string[];
  drop: (item: MaterialItem) => void;
  remove: (item: MaterialItem) => void;
  addRecipeLine: (itemId: string, text: string) => void;
  editRecipeEntry: (
    itemId: string,
    entryId: string,
    change: { amount?: string; unit?: string }
  ) => void;
  removeRecipeEntry: (itemId: string, entryId: string) => void;
}

interface WorkbenchMaterialRowProps {
  item: MaterialItem;
  index: number;
  previous: MaterialItem | undefined;
  columns: readonly FieldDefinition[];
  customGroups: readonly string[];
  usage: NameUsage | undefined;
  recipe: readonly RecipeLine[];
  recipeUsers: readonly string[];
  plateWellCount: number;
  isClashing: boolean;
  isDuplicateName: boolean;
  freshStamp: number | undefined;
  editing: MaterialCellEditing;
  actions: MaterialRowActions;
}

const FOCUSABLE = 'input, [tabindex="0"]';
const FRESH_FLASH_MS = 1800;
const FRESH_FLASH: Keyframe[] = [
  { backgroundColor: 'hsl(var(--primary) / 0.3)' },
  { backgroundColor: 'transparent' },
];

const isPastDate = (value: string) => !!value.trim() && value < localToday();

interface EditableCellProps {
  cell: MaterialCell;
  editing: MaterialCellEditing;
  className?: string;
  display: ReactNode;
  editor: () => ReactNode;
  onFillDown: () => void;
}

function EditableCell({
  cell,
  editing,
  className = '',
  display,
  editor,
  onFillDown,
}: EditableCellProps) {
  const isEditing = isSameCell(editing.cell, cell);
  const cellRef = useRef<HTMLTableCellElement>(null);
  const leave = useFocusLeave(() => editing.finish(cell));

  useEffect(() => {
    if (!isEditing) return;
    const control = cellRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    control?.focus();
    if (control instanceof HTMLInputElement) control.select();
  }, [isEditing]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      onFillDown();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      editing.move(cell, event.shiftKey ? -1 : 1);
    } else if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      editing.finish(cell);
    }
  };

  return (
    <td
      ref={cellRef}
      className={`${MATERIAL_CELL} ${className} ${
        isEditing ? '!py-1' : 'inline-edit-host cursor-text'
      }`}
      onMouseDown={event => {
        if (isEditing || event.button !== 0) return;
        event.preventDefault();
        editing.start(cell);
      }}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      onBlur={isEditing ? leave.onBlur : undefined}
      onFocus={leave.onFocus}
    >
      {isEditing ? editor() : <span className="inline-edit">{display}</span>}
    </td>
  );
}

export function WorkbenchMaterialRow({
  item,
  index,
  previous,
  columns,
  customGroups,
  usage,
  recipe,
  recipeUsers,
  plateWellCount,
  isClashing,
  isDuplicateName,
  freshStamp,
  editing,
  actions,
}: WorkbenchMaterialRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const fields = materialFields(item);
  const summary = [
    plateWellCount ? `Plate: ${plateWellCount} ${plateWellCount === 1 ? 'well' : 'wells'}` : '',
    usage ? usageSummary(usage) : '',
    ...recipeUsers.map(user => `in ${user}`),
  ]
    .filter(Boolean)
    .join(' · ');
  const fillDown = (key: string) => () => {
    if (previous && key !== 'name') actions.fillDown(item, previous, key);
  };

  useEffect(() => {
    if (freshStamp)
      rowRef.current?.animate(FRESH_FLASH, { duration: FRESH_FLASH_MS, easing: 'ease-out' });
  }, [freshStamp]);

  return (
    <tr ref={rowRef} className={materialRowClass(index)}>
      <EditableCell
        cell={{ itemId: item.id, key: 'name' }}
        editing={editing}
        className={MATERIAL_NAME}
        display={
          item.name || <span className="font-normal italic text-muted-foreground">Unnamed</span>
        }
        editor={() => (
          <input
            value={item.name}
            aria-invalid={isDuplicateName}
            placeholder="Name"
            aria-label="Material name"
            spellCheck={false}
            className="inline-edit-field font-semibold"
            onChange={event => actions.rename(item.id, event.target.value)}
          />
        )}
        onFillDown={fillDown('name')}
      />
      <EditableCell
        cell={{ itemId: item.id, key: 'type' }}
        editing={editing}
        className={MATERIAL_MUTED}
        display={
          item.group === UNSORTED_GROUP ? (
            <span className="text-label-xs italic text-muted-foreground">choose</span>
          ) : (
            item.type
          )
        }
        editor={() => (
          <WorkbenchMaterialKindSelector
            kind={item}
            customGroups={customGroups}
            onChoose={kind => actions.chooseKind(item.id, kind)}
            onNewGroup={() => actions.requestNewGroup(item.id)}
          />
        )}
        onFillDown={fillDown('type')}
      />
      {columns.map(column => {
        const definition = fields.find(own => own.key === column.key) ?? column;
        if (definition.key === RECIPE_FIELD) {
          const ingredients = recipe
            .map(({ ingredient }) => ingredient?.name.trim())
            .filter(Boolean)
            .join(', ');
          const note = (item.values[RECIPE_FIELD] ?? '').trim();
          const recipeTooltip = (
            <div className="flex flex-col gap-0.5">
              <b className="text-foreground">{item.name.trim()}:</b>
              {recipe.map(({ entry, ingredient }) => (
                <span key={entry.id} className="pl-3">
                  {ingredient?.name.trim() ?? 'No longer in Materials'} ·{' '}
                  {entry.amount.trim() ? displayValue(entry.amount, entry.unit) : 'amount not set'}
                </span>
              ))}
              {note && <span className="pt-1 text-muted-foreground">{note}</span>}
            </div>
          );
          return (
            <EditableCell
              key={definition.key}
              cell={{ itemId: item.id, key: definition.key }}
              editing={editing}
              display={
                ingredients ? (
                  <Tooltip content={recipeTooltip}>
                    <span className="cursor-pointer border-b border-dotted border-primary/50 text-primary">
                      {ingredients}
                    </span>
                  </Tooltip>
                ) : (
                  materialText(item, definition)
                )
              }
              editor={() => (
                <WorkbenchMaterialRecipeEditor
                  lines={recipe}
                  note={item.values[RECIPE_FIELD] ?? ''}
                  onAdd={text => actions.addRecipeLine(item.id, text)}
                  onAmountChange={(entryId, amount) =>
                    actions.editRecipeEntry(item.id, entryId, { amount })
                  }
                  onUnitChange={(entryId, unit) =>
                    actions.editRecipeEntry(item.id, entryId, { unit })
                  }
                  onRemove={entryId => actions.removeRecipeEntry(item.id, entryId)}
                  onNoteChange={note => actions.writeField(item.id, definition, note)}
                />
              )}
              onFillDown={fillDown(definition.key)}
            />
          );
        }
        const isShown = item.shownFields.includes(definition.key);
        const shown = isShown ? materialText(item, definition) : '';
        const isExpired = !!definition.warnsWhenPast && isPastDate(shown);
        const tone =
          definition.key === CONJUGATE_FIELD && isClashing
            ? MATERIAL_WARNING_TEXT
            : isExpired
              ? 'text-danger-text'
              : '';
        return (
          <EditableCell
            key={definition.key}
            cell={{ itemId: item.id, key: definition.key }}
            editing={editing}
            className={tone}
            display={shown}
            editor={() => (
              <WorkbenchMaterialCellField
                item={item}
                definition={definition}
                isExpired={isExpired}
                suggestions={typed => actions.suggest(item.id, definition.key, typed)}
                onValueChange={value => actions.writeField(item.id, definition, value)}
                onUnitChange={unit => actions.setUnit(item.id, definition.key, unit)}
              />
            )}
            onFillDown={fillDown(definition.key)}
          />
        );
      })}
      <td className={`${MATERIAL_CELL} ${MATERIAL_MUTED}`}>
        {summary || <span className={`italic ${MATERIAL_WARNING_TEXT}`}>Not used</span>}
      </td>
      <td className={MATERIAL_ACTIONS_CELL}>
        <Button variant="ghost" size="xs" className={ROW_ACTION} onClick={() => actions.drop(item)}>
          Drop
        </Button>
        <Button
          variant="ghost-danger"
          size="xs"
          className={ROW_ACTION}
          onClick={() => actions.remove(item)}
        >
          Remove
        </Button>
      </td>
    </tr>
  );
}
