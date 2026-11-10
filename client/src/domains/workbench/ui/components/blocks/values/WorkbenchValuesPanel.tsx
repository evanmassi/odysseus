import { useEffect, useMemo, useState } from 'react';

import { Button, Select } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useProtocolOutsidePages, useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameUsage, usageSummary } from '../../../../utils/formulas/nameUsage';
import { displayValue } from '../../../../utils/formulas/quantities';
import { guessMaterial, normalizeMaterialKey } from '../../../../utils/materials/materialGuesser';
import { materialFromGuess } from '../../../../utils/materials/materialItems';
import { rememberedKinds } from '../../../../utils/materials/materialMemory';
import { editRecipeEntry } from '../../../../utils/materials/materialRecipe';
import { acceptStepReadings, readStepReadings } from '../../../../utils/steps/stepReadings';
import {
  removePlateRow,
  setPlateRowUnit,
  setPlateRowValue,
  type PlateValueRow,
} from '../../../../utils/values/plateValueRows';
import {
  addSuggestedValue,
  addValueLines,
  addValueSection,
  materialsById,
  removeValue,
  removeValueSection,
  renameValue,
  renameValueSection,
  restoreValues,
  sectionPeers,
  setValueAmount,
  setValueUnit,
  type RemovedValues,
} from '../../../../utils/values/valueEdits';
import { valueSectionChoices, valueSuggestions } from '../../../../utils/values/valueSuggestions';
import {
  buildValueTable,
  type ValueTableCell,
  type ValueTableColumn,
  type ValueTableGroup,
  type ValueTableRow,
} from '../../../../utils/values/valueTable';

import { WorkbenchValueAddField } from './WorkbenchValueAddField';
import { WorkbenchValueGroupTable } from './WorkbenchValueGroupTable';
import { WorkbenchValueReadingsSection } from './WorkbenchValueReadingsSection';
import { WorkbenchValueRow, type ValueCell, type ValueRowData } from './WorkbenchValueRow';
import { WorkbenchValueSection } from './WorkbenchValueSection';

import type { ValueRowActions } from './WorkbenchValueTableRow';
import type { ValueSuggestion } from '../../../../utils/values/valueSuggestions';
import type { Protocol, ValuesBlock } from '@odysseus/shared-schemas';

interface WorkbenchValuesPanelProps {
  block: ValuesBlock;
}

interface GeneralEdit {
  itemId: string;
  cell: ValueCell;
}

interface ColumnEdit {
  groupKey: string;
  itemIds: string[];
}

const UNDO_MS = 8000;
const GENERAL_SECTION = '';
const MIX_CHOICE = 'mix';
const TITLE_INPUT =
  '[field-sizing:content] min-w-[4ch] bg-transparent type-label text-label-md font-semibold text-foreground outline-none placeholder:text-muted-foreground';

function plateRemovalMessage(row: PlateValueRow): string {
  const { source } = row;
  if (source.kind === 'count') {
    return `Clear “${source.count.subject}” from the plate? Its ${source.count.tally} wells keep anything else in them.`;
  }
  const { subject, value, unit, source: from } = source.amount;
  if (from.kind === 'wells') {
    const wells = from.keys.length === 1 ? 'well' : `${from.keys.length} wells`;
    return `Remove ${displayValue(value, unit)} of ${subject} from its ${wells}?`;
  }
  return `Remove the ${subject} dilution? Its wells keep the ${subject} label.`;
}

function sourceLines(cell: ValueTableCell): string[] {
  if (cell.origin === 'worked') return [];
  if (cell.source.kind === 'recipe') return ['Changing it here changes the recipe in Materials'];
  if (!cell.isEditable) return ['Counted from the plate map'];
  if (cell.origin === 'plate') return ['Changing it here changes the plate map'];
  if (cell.origin === 'materials') return ['Changing it here changes Materials'];
  return [];
}

const cellsOf = (group: ValueTableGroup) => group.rows.flatMap(row => row.cells);

const typedItemIds = (cells: readonly ValueTableCell[]) =>
  cells.flatMap(cell =>
    cell.source.kind === 'item' && cell.origin === 'typed' ? [cell.source.itemId] : []
  );

const unitOfColumn = (group: ValueTableGroup, column: ValueTableColumn) =>
  cellsOf(group).find(cell => cell.columnKey === column.key)?.unit ?? '';

const columnSuggestion = (group: ValueTableGroup, column: ValueTableColumn): ValueSuggestion => ({
  kind: 'value',
  name: column.label,
  value: '',
  unit: unitOfColumn(group, column),
  label: column.label,
});

export function WorkbenchValuesPanel({ block }: WorkbenchValuesPanelProps) {
  const protocol = useProtocolOutsidePages();
  const calculation = useWorkbenchStore(state => state.calculation);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);
  const [generalEdit, setGeneralEdit] = useState<GeneralEdit>();
  const [editingCellId, setEditingCellId] = useState<string>();
  const [editingNameRowId, setEditingNameRowId] = useState<string>();
  const [columnEdit, setColumnEdit] = useState<ColumnEdit>();
  const [addingRowId, setAddingRowId] = useState<string>();
  const [removed, setRemoved] = useState<RemovedValues>();
  const [removingPlateRow, setRemovingPlateRow] = useState<PlateValueRow>();

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(undefined), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const materials = useMemo(() => materialsById(protocol), [protocol]);
  const groups = useMemo(
    () => buildValueTable(protocol, block, materials, calculation),
    [protocol, block, materials, calculation]
  );
  const generalItems = useMemo(
    () =>
      sectionPeers(block, GENERAL_SECTION).flatMap(item => ('materialField' in item ? [] : [item])),
    [block]
  );
  const usageIds = useMemo(
    () => [
      ...generalItems.map(item => item.id),
      ...groups.flatMap(group => cellsOf(group).map(cell => cell.nameId)),
    ],
    [generalItems, groups]
  );
  const usageEntries = useWorkbenchData(state => [
    ...nameUsage(state.protocol, state.calculation, usageIds),
  ]);
  const usage = useMemo(() => new Map(usageEntries), [usageEntries]);
  const remembered = useMemo(() => rememberedKinds(memory, protocol), [memory, protocol]);
  const isFirstValuesBlock =
    protocol.blocks.find(candidate => candidate.type === 'values')?.id === block.id;
  const readings = useWorkbenchData(state =>
    isFirstValuesBlock ? readStepReadings(state.protocol, state.calculation).values : []
  );
  const takenNames = useMemo(() => new Set(calculation.names.keys()), [calculation]);
  const namedIds = useMemo(
    () => new Set([...calculation.names.values()].map(entry => entry.id)),
    [calculation]
  );

  const edit = (mutate: (draft: Protocol) => void) => updateProtocol(mutate);
  const usageText = (nameId: string) => {
    const found = usage.get(nameId);
    return found ? usageSummary(found) : '';
  };

  const remove = (mutate: (draft: Protocol) => RemovedValues | undefined) => {
    let entry: RemovedValues | undefined;
    edit(draft => {
      entry = mutate(draft);
    });
    setGeneralEdit(undefined);
    setEditingCellId(undefined);
    setRemoved(entry);
  };

  const undo = () => {
    if (!removed) return;
    const entry = removed;
    edit(draft => restoreValues(draft, block.id, entry));
    setRemoved(undefined);
  };

  const addToRow = (
    row: ValueTableRow,
    change: (draft: Protocol, sectionId: string) => string | undefined
  ) => {
    let sectionId: string | undefined;
    let added: string | undefined;
    edit(draft => {
      sectionId =
        row.section?.id ??
        (row.material ? addValueSection(draft, block.id, row.material.id) : undefined);
      if (sectionId) added = change(draft, sectionId);
    });
    return { sectionId, added };
  };

  const rowSuggestions = (group: ValueTableGroup, row: ValueTableRow): ValueSuggestion[] => {
    const onRow = new Set(row.cells.map(cell => cell.columnKey));
    const fromColumns = group.columns
      .filter(column => column.origin === 'typed' && !onRow.has(column.key))
      .map(column => columnSuggestion(group, column));
    const section = row.section ?? (row.material && { id: row.id, materialId: row.material.id });
    const usual = section ? valueSuggestions(protocol, block, section, row.material) : [];
    const seen = new Set(fromColumns.map(suggestion => normalizeMaterialKey(suggestion.label)));
    return [
      ...fromColumns,
      ...usual.filter(suggestion => !seen.has(normalizeMaterialKey(suggestion.label))),
    ];
  };

  const actionsFor = (group: ValueTableGroup): ValueRowActions => ({
    viewOf: cell => {
      const isNamed = namedIds.has(cell.nameId);
      const used = usageText(cell.nameId);
      const usageLine = used ? `Used in ${used}` : 'Not used in any step or formula';
      return {
        value: cell.value,
        unit: cell.unit,
        units: cell.units,
        hoverLines: [
          cell.fullName,
          ...(isNamed ? [usageLine] : []),
          ...(cell.note ? [cell.note] : []),
          ...sourceLines(cell),
        ],
        isEditable: cell.isEditable,
        canRemove: cell.canRemove,
        isDuplicate: calculation.duplicateIds.has(cell.nameId),
        isUsed: !!used || !isNamed,
        isWorked: cell.origin === 'worked',
      };
    },
    onEditCell: setEditingCellId,
    onEditName: setEditingNameRowId,
    onRename: (row, name) => {
      const { section } = row;
      if (section) edit(draft => renameValueSection(draft, block.id, section.id, name));
    },
    onToggleAdd: rowId => setAddingRowId(current => (current === rowId ? undefined : rowId)),
    onFillColumn: (row, column) => {
      const { added } = addToRow(row, (draft, sectionId) =>
        addSuggestedValue(draft, block.id, sectionId, columnSuggestion(group, column))
      );
      setEditingCellId(added);
    },
    onValueChange: (cell, value) =>
      edit(draft => {
        const { source } = cell;
        if (source.kind === 'item') setValueAmount(draft, block.id, source.itemId, value);
        else if (source.kind === 'plate') setPlateRowValue(draft, source.row, value);
        else if (source.kind === 'recipe') {
          editRecipeEntry(draft, source.materialId, source.entryId, { amount: value });
        }
      }),
    onUnitChange: (cell, unit) =>
      edit(draft => {
        const { source } = cell;
        if (source.kind === 'item') setValueUnit(draft, block.id, source.itemId, unit);
        else if (source.kind === 'plate') setPlateRowUnit(draft, source.row, unit);
        else if (source.kind === 'recipe') {
          editRecipeEntry(draft, source.materialId, source.entryId, { unit });
        }
      }),
    onRemoveCell: cell => {
      const { source } = cell;
      if (source.kind === 'item') {
        remove(draft => removeValue(draft, block.id, source.itemId));
      } else if (source.kind === 'plate') {
        setEditingCellId(undefined);
        setRemovingPlateRow(source.row);
      }
    },
    onRemoveRow: row => {
      const { section } = row;
      if (section) remove(draft => removeValueSection(draft, block.id, section.id));
    },
  });

  const renderAdder = (group: ValueTableGroup, row: ValueTableRow) => (
    <WorkbenchValueAddField
      ownerName={row.name}
      placeholder={`Add to ${row.name || 'this mix'}: Volume per well 50 µL`}
      takenNames={takenNames}
      suggestions={rowSuggestions(group, row)}
      isFocusedOnMount
      onAddLines={lines => {
        const { sectionId, added } = addToRow(row, (draft, id) =>
          addValueLines(draft, block.id, lines, id)
        );
        setAddingRowId(sectionId);
        if (added) setEditingCellId(added);
      }}
      onSuggest={suggestion => {
        const { added } = addToRow(row, (draft, sectionId) =>
          addSuggestedValue(draft, block.id, sectionId, suggestion)
        );
        setAddingRowId(undefined);
        setEditingCellId(added);
      }}
      onClose={() => setAddingRowId(undefined)}
    />
  );

  const editingColumnKey = (group: ValueTableGroup) => {
    if (columnEdit?.groupKey !== group.key) return undefined;
    const [firstId] = columnEdit.itemIds;
    return cellsOf(group).find(cell => cell.id === firstId)?.columnKey;
  };

  const generalRow = (item: (typeof generalItems)[number]): ValueRowData => ({
    id: item.id,
    label: item.name,
    fullName: item.name,
    value: item.value,
    unit: item.unit,
    units: undefined,
    tag: undefined,
    isValueEditable: true,
    canRemove: true,
    isDuplicate: calculation.duplicateIds.has(item.id),
    usage: usageText(item.id),
  });

  const moveGeneralEdit = (itemId: string, cell: ValueCell, step: 1 | -1) => {
    const cells = generalItems.flatMap(item =>
      (['name', 'value'] as const).map(next => ({ itemId: item.id, cell: next }))
    );
    const at = cells.findIndex(candidate => candidate.itemId === itemId && candidate.cell === cell);
    setGeneralEdit(cells[at + step]);
  };

  return (
    <div className="px-2 pb-3 pt-1">
      <WorkbenchValueSection
        title={
          groups.length > 0 ? (
            <input
              value={block.generalTitle ?? 'Whole experiment'}
              placeholder="Name this group"
              aria-label="Group name"
              spellCheck={false}
              className={TITLE_INPUT}
              onChange={event =>
                edit(draft => {
                  const target = draft.blocks.find(candidate => candidate.id === block.id);
                  if (target?.type === 'values') target.generalTitle = event.target.value;
                })
              }
            />
          ) : (
            ''
          )
        }
        takenNames={takenNames}
        onAddLines={lines => {
          let needsNumber: string | undefined;
          edit(draft => {
            needsNumber = addValueLines(draft, block.id, lines, GENERAL_SECTION);
          });
          if (needsNumber) setGeneralEdit({ itemId: needsNumber, cell: 'value' });
        }}
      >
        {generalItems.map(item => (
          <WorkbenchValueRow
            key={item.id}
            row={generalRow(item)}
            editingCell={generalEdit?.itemId === item.id ? generalEdit.cell : undefined}
            onEdit={cell => setGeneralEdit(cell ? { itemId: item.id, cell } : undefined)}
            onMoveEdit={(cell, step) => moveGeneralEdit(item.id, cell, step)}
            onRename={name => edit(draft => renameValue(draft, block.id, item.id, name))}
            onValueChange={value => edit(draft => setValueAmount(draft, block.id, item.id, value))}
            onUnitChange={unit => edit(draft => setValueUnit(draft, block.id, item.id, unit))}
            onRemove={() => remove(draft => removeValue(draft, block.id, item.id))}
          />
        ))}
      </WorkbenchValueSection>
      <div className="mt-5 flex flex-col gap-5">
        {groups.map(group => (
          <WorkbenchValueGroupTable
            key={group.key}
            group={group}
            editingCellId={editingCellId}
            editingNameRowId={editingNameRowId}
            editingColumnKey={editingColumnKey(group)}
            addingRowId={addingRowId}
            actions={actionsFor(group)}
            renderAdder={row => renderAdder(group, row)}
            onEditColumn={column =>
              setColumnEdit(
                column && {
                  groupKey: group.key,
                  itemIds: typedItemIds(
                    cellsOf(group).filter(cell => cell.columnKey === column.key)
                  ),
                }
              )
            }
            onRenameColumn={name => {
              const itemIds = columnEdit?.itemIds ?? [];
              edit(draft => {
                for (const itemId of itemIds) renameValue(draft, block.id, itemId, name);
              });
            }}
          />
        ))}
      </div>
      {removed && (
        <p className="mt-3 flex items-center gap-2 px-2 text-body-sm text-muted-foreground">
          Removed {removed.label}
          <Button variant="ghost" size="xs" onClick={undo}>
            Undo
          </Button>
        </p>
      )}
      {readings.length > 0 && (
        <div className="mt-5 max-w-xl">
          <WorkbenchValueReadingsSection
            readings={readings}
            onAccept={accepted =>
              edit(draft =>
                acceptStepReadings(draft, { values: accepted }, name =>
                  materialFromGuess(guessMaterial(name, remembered), memory)
                )
              )
            }
            onIgnore={reading =>
              edit(draft => {
                draft.ignoredReadings.push(reading.key);
              })
            }
          />
        </div>
      )}
      <div className="mt-4 max-w-xs px-2">
        <Select
          size="sm"
          value=""
          placeholder="+ Values for…"
          aria-label="Add values for a material or mix"
          options={[
            ...valueSectionChoices(protocol, block),
            { value: MIX_CHOICE, label: 'A mix or cocktail' },
          ]}
          onChange={choice => {
            if (choice === null || choice === '') return;
            let added: string | undefined;
            edit(draft => {
              added = addValueSection(
                draft,
                block.id,
                choice === MIX_CHOICE ? undefined : String(choice)
              );
            });
            if (choice === MIX_CHOICE) setEditingNameRowId(added);
            else setAddingRowId(added);
          }}
        />
      </div>
      <ConfirmDialog
        isOpen={!!removingPlateRow}
        variant="danger"
        title="Remove from the plate"
        message={removingPlateRow ? plateRemovalMessage(removingPlateRow) : ''}
        confirmText="Remove"
        onConfirm={() => {
          const row = removingPlateRow;
          setRemovingPlateRow(undefined);
          if (row) edit(draft => removePlateRow(draft, row));
        }}
        onCancel={() => setRemovingPlateRow(undefined)}
      />
    </div>
  );
}
