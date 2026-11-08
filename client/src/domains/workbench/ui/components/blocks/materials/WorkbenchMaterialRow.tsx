import { useEffect, useRef, type ReactNode } from 'react';

import { Button, Input } from '@shared/ui';

import { usageSummary, type NameUsage } from '../../../../utils/formulas/nameUsage';
import { materialFields } from '../../../../utils/materials/materialCatalog';
import { CONJUGATE_FIELD } from '../../../../utils/materials/materialClashes';
import { UNSORTED_GROUP, materialText } from '../../../../utils/materials/materialItems';
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

import type { MaterialKind } from './materialSelectOptions';
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
}

interface WorkbenchMaterialRowProps {
  item: MaterialItem;
  index: number;
  previous: MaterialItem | undefined;
  columns: readonly FieldDefinition[];
  customGroups: readonly string[];
  usage: NameUsage | undefined;
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
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isEditing) return;
    const control = cellRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    control?.focus();
    if (control instanceof HTMLInputElement) control.select();
  }, [isEditing]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

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
        isEditing ? '!py-1' : 'cursor-text hover:shadow-[inset_0_-1px_0_hsl(var(--primary)/0.55)]'
      }`}
      onMouseDown={event => {
        if (isEditing || event.button !== 0) return;
        event.preventDefault();
        editing.start(cell);
      }}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      onBlur={() => {
        // PITFALL: focus can hop into a portaled dropdown; its onFocus bubbles here through React and cancels the stop.
        if (isEditing) blurTimer.current = setTimeout(() => editing.finish(cell));
      }}
      onFocus={() => clearTimeout(blurTimer.current)}
    >
      {isEditing ? editor() : display}
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
  isClashing,
  isDuplicateName,
  freshStamp,
  editing,
  actions,
}: WorkbenchMaterialRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const fields = materialFields(item);
  const summary = usage ? usageSummary(usage) : '';
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
          <Input
            size="xs"
            fullWidth
            value={item.name}
            state={isDuplicateName ? 'error' : 'default'}
            placeholder="Name"
            aria-label="Material name"
            spellCheck={false}
            inputClassName="min-w-32 font-semibold"
            onValueChange={name => actions.rename(item.id, name)}
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
