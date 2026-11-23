import { memo, useEffect, useRef, type ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { Button, Select, Tooltip, type SelectOption } from '@shared/ui';

import { useFocusLeave } from '../../../../hooks/useFocusLeave';
import { usageSummary, type NameUsage } from '../../../../utils/formulas/nameUsage';
import { displayValue } from '../../../../utils/formulas/quantities';
import { workedCountsByKey } from '../../../../utils/materials/cellCounts';
import { CONJUGATE_FIELD } from '../../../../utils/materials/conjugateConflicts';
import { BIO_GROUP, fieldUnit, materialFields } from '../../../../utils/materials/materialCatalog';
import { DONORS_LABEL } from '../../../../utils/materials/materialDonors';
import {
  RECIPE_FIELD,
  UNSORTED_GROUP,
  materialText,
} from '../../../../utils/materials/materialItems';
import { displayNameOf } from '../../../../utils/materials/materialLookup';
import { ADD_ICON } from '../../board/addIconClass';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

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
import { WorkbenchMaterialRecipeEditor } from './WorkbenchMaterialRecipeEditor';
import { WorkbenchMaterialTypeSelector } from './WorkbenchMaterialTypeSelector';

import type { MaterialTypeSelection } from './materialSelectOptions';
import type { DiluentUse } from '../../../../utils/dilutions/dilutionDiluents';
import type { RecipeLine } from '../../../../utils/materials/materialRecipe';
import type { PlateSwatch } from '../../../../utils/plateMap/plateSwatches';
import type { FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

export interface MaterialRowActions {
  makeDonorOf: (itemId: string, targetId: string) => void;
  rename: (itemId: string, name: string) => void;
  writeField: (itemId: string, definition: FieldDefinition, value: string) => void;
  setUnit: (itemId: string, key: string, unit: string) => void;
  chooseKind: (itemId: string, kind: MaterialTypeSelection) => void;
  requestNewGroup: (itemId: string) => void;
  fillDown: (item: MaterialItem, source: MaterialItem, key: string) => void;
  suggest: (itemId: string, key: string, typed: string) => string[];
  setAside: (item: MaterialItem) => void;
  remove: (item: MaterialItem) => void;
  addRecipeLine: (itemId: string, text: string) => void;
  editRecipeEntry: (
    itemId: string,
    entryId: string,
    change: { amount?: string; unit?: string }
  ) => void;
  removeRecipeEntry: (itemId: string, entryId: string) => void;
  startDonors: (itemId: string) => void;
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
  diluentUse: DiluentUse | undefined;
  panelDetectors: string;
  hasConjugateConflict: boolean;
  isNameTaken: boolean;
  swatch: PlateSwatch | undefined;
  freshStamp: number | undefined;
  editing: MaterialCellEditing;
  actions: MaterialRowActions;
  donorTargets: readonly SelectOption[];
}

const COMPARED_PROPS = new Set<keyof WorkbenchMaterialRowProps>([
  'columns',
  'recipe',
  'recipeUsers',
  'swatch',
]);

const isSameList = <Entry,>(
  a: readonly Entry[],
  b: readonly Entry[],
  isSame: (x: Entry, y: Entry) => boolean = (x, y) => x === y
) => a.length === b.length && a.every((entry, index) => isSame(entry, b[index]));

const isSameRecipeLine = (a: RecipeLine, b: RecipeLine) =>
  a.entry === b.entry && a.ingredient === b.ingredient;

const isSameSwatch = (a: PlateSwatch | undefined, b: PlateSwatch | undefined) =>
  a?.color === b?.color && a?.kind === b?.kind;

const isSameRow = (a: WorkbenchMaterialRowProps, b: WorkbenchMaterialRowProps) =>
  isSameList(a.columns, b.columns) &&
  isSameSwatch(a.swatch, b.swatch) &&
  isSameList(a.recipeUsers, b.recipeUsers) &&
  isSameList(a.recipe, b.recipe, isSameRecipeLine) &&
  (Object.keys(a) as Array<keyof WorkbenchMaterialRowProps>).every(
    key => COMPARED_PROPS.has(key) || a[key] === b[key]
  );

const FOCUSABLE = 'input, [tabindex="0"]';
const FRESH_FLASH_MS = 1800;
const FRESH_FLASH: Keyframe[] = [
  { backgroundColor: 'hsl(var(--primary) / 0.3)' },
  { backgroundColor: 'transparent' },
];

const localToday = (): string => new Date().toLocaleDateString('en-CA');
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

export const WorkbenchMaterialRow = memo(function WorkbenchMaterialRow({
  item,
  index,
  previous,
  columns,
  customGroups,
  usage,
  recipe,
  recipeUsers,
  plateWellCount,
  diluentUse,
  panelDetectors,
  hasConjugateConflict,
  isNameTaken,
  swatch,
  freshStamp,
  editing,
  actions,
  donorTargets,
}: WorkbenchMaterialRowProps) {
  const donorChoices = donorTargets.filter(target => target.value !== item.id);
  const canBeDonor = donorChoices.length > 0 && !item.donors?.rows.length;
  const rowRef = useRef<HTMLTableRowElement>(null);
  const fields = materialFields(item);
  const workedCounts = workedCountsByKey(item.values);
  const summary = [
    plateWellCount ? `Plate: ${plateWellCount} ${plateWellCount === 1 ? 'well' : 'wells'}` : '',
    panelDetectors,
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
          <span className="flex items-center gap-2">
            <WorkbenchIndicatorSwatch swatch={swatch} />
            {item.name || <span className="font-normal italic text-muted-foreground">Unnamed</span>}
          </span>
        }
        editor={() => (
          <input
            value={item.name}
            aria-invalid={isNameTaken}
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
          <WorkbenchMaterialTypeSelector
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
            .map(({ ingredient }) => ingredient && displayNameOf(ingredient))
            .filter(Boolean)
            .join(', ');
          const note = (item.values[RECIPE_FIELD] ?? '').trim();
          const recipeTooltip = (
            <div className="flex flex-col gap-0.5">
              <b className="text-foreground">{item.name.trim()}:</b>
              {recipe.map(({ entry, ingredient }) => (
                <span key={entry.id} className="pl-3">
                  {ingredient?.name.trim() ?? 'Removed from Materials'} ·{' '}
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
        const worked = shown ? undefined : workedCounts.get(definition.key);
        const isExpired = !!definition.warnsWhenPast && isPastDate(shown);
        const tone =
          definition.key === CONJUGATE_FIELD && hasConjugateConflict
            ? MATERIAL_WARNING_TEXT
            : isExpired
              ? 'text-danger-text'
              : '';
        return (
          <EditableCell
            key={definition.key}
            cell={{ itemId: item.id, key: definition.key }}
            editing={editing}
            className={`${tone} ${definition.kind === 'number' ? 'text-right' : ''}`}
            display={
              worked ? (
                <Tooltip content={`Worked out: ${worked.working}`}>
                  <span className="italic text-muted-foreground">
                    {displayValue(worked.text, fieldUnit(item, definition))}
                  </span>
                </Tooltip>
              ) : (
                shown
              )
            }
            editor={() => (
              <WorkbenchMaterialCellField
                item={item}
                definition={definition}
                placeholder={worked?.text}
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
        {diluentUse?.need && (
          <span className="font-semibold text-foreground">
            Need ≈ {diluentUse.need}
            {summary && <span className="font-normal text-muted-foreground"> · </span>}
          </span>
        )}
        {summary ||
          (!diluentUse && <span className={`italic ${MATERIAL_WARNING_TEXT}`}>Not used</span>)}
      </td>
      <td className={MATERIAL_ACTIONS_CELL}>
        {item.group === BIO_GROUP && !item.donors && (
          <Tooltip content="List the donors this material came from, one row each">
            <Button
              variant="ghost"
              size="xs"
              className={ROW_ACTION}
              leftIcon={<Plus aria-hidden className={ADD_ICON} />}
              onClick={() => actions.startDonors(item.id)}
            >
              Add {DONORS_LABEL.toLowerCase()}
            </Button>
          </Tooltip>
        )}
        {canBeDonor && (
          <Tooltip content="Move it under a cell material as one of its donors; matching fields come along">
            <span className={`${ROW_ACTION} inline-flex w-36`}>
              <Select
                size="xs"
                isQuiet
                value=""
                placeholder="Move to…"
                aria-label={`Move ${item.name} to a donor list`}
                options={donorChoices}
                onChange={choice => choice && actions.makeDonorOf(item.id, String(choice))}
              />
            </span>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="xs"
          className={ROW_ACTION}
          onClick={() => actions.setAside(item)}
        >
          Set aside
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
}, isSameRow);
