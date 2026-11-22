import { useCallback, useEffect, useMemo, useState } from 'react';

import { withGreekLetters, normalizeMaterialKey } from '@odysseus/shared-schemas';
import { Plus } from 'lucide-react';

import { Button, PanelEmptyState } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useStableActions } from '../../../../hooks/useStableActions';
import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import { useProtocolWith, useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameUsage, usageSummary, usageTitle } from '../../../../utils/formulas/nameUsage';
import { displayValue } from '../../../../utils/formulas/quantities';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import { materialFromGuess } from '../../../../utils/materials/materialItems';
import { materialKnowledge } from '../../../../utils/materials/materialMemory';
import { plateNameOffers } from '../../../../utils/materials/plateNameOffers';
import { labwareTitleOf } from '../../../../utils/plateMap/plateMapTabs';
import { acceptStepReadings, readStepReadings } from '../../../../utils/steps/stepReadings';
import { TOTAL_WELL_VOLUME, VOLUME_PER_WELL } from '../../../../utils/terms/termList';
import { unitMismatch } from '../../../../utils/terms/termLookup';
import { removePlateRow, type PlateValueRow } from '../../../../utils/values/plateValueRows';
import {
  addRoutedValue,
  addSuggestedValue,
  addValueLines,
  addValueRow,
  materialsById,
  removeValue,
  removeValueRow,
  renameValue,
  renameValueRow,
  restoreValues,
  valuesInRow,
  setValueAmount,
  setValueUnit,
  type RemovedValues,
} from '../../../../utils/values/valueEdits';
import {
  columnUnit,
  fillBlanks,
  fillTargets,
  slotRoute,
  writeCellUnit,
  writeCellValue,
} from '../../../../utils/values/valueFill';
import { WHOLE_EXPERIMENT, WHOLE_EXPERIMENT_TITLE } from '../../../../utils/values/valueNames';
import { neededForText, valueNeeds } from '../../../../utils/values/valueNeeds';
import {
  routeValueLine,
  routedValueGuess,
  rowValueGuess,
} from '../../../../utils/values/valueRouting';
import { valueSuggestions } from '../../../../utils/values/valueSuggestions';
import {
  buildValueTable,
  type ValueCell,
  type ValueTableColumn,
  type ValueTableGroup,
  type ValueTableRow,
} from '../../../../utils/values/valueTable';
import { ADD_ICON } from '../../board/addIconClass';
import { CARD_ICONS } from '../../board/cardIcons';
import { WorkbenchMaterialPlateNamesSection } from '../materials/WorkbenchMaterialPlateNamesSection';

import { WorkbenchValueAddField } from './WorkbenchValueAddField';
import { WorkbenchValueGroupTable } from './WorkbenchValueGroupTable';
import {
  WorkbenchValueItem,
  type GeneralValueActions,
  type ValueItemField,
  type ValueRowData,
} from './WorkbenchValueItem';
import { WorkbenchValueNeededRow } from './WorkbenchValueNeededRow';
import { WorkbenchValueReadingsSection } from './WorkbenchValueReadingsSection';
import { WorkbenchValueSection } from './WorkbenchValueSection';

import type { ValueCellView } from './WorkbenchValueCell';
import type { ValueColumnActions } from './WorkbenchValueHeaderRow';
import type { FillOffer, ValueRowActions } from './WorkbenchValueTableRow';
import type { ValueSuggestion } from '../../../../utils/values/valueSuggestions';
import type { Protocol, ValuesCard } from '@odysseus/shared-schemas';

interface WorkbenchValuesPanelProps {
  card: ValuesCard;
}

interface GeneralEdit {
  itemId: string;
  cell: ValueItemField;
}

interface ColumnEdit {
  groupKey: string;
  itemIds: string[];
}

interface ColumnFill {
  groupKey: string;
  columnKey: string;
}

const UNDO_MS = 8000;
const TITLE_INPUT =
  'type-name text-label-md font-semibold text-foreground placeholder:text-muted-foreground';

function plateRemovalMessage(row: PlateValueRow): string {
  const { source } = row;
  if (source.kind === 'count') {
    return `Clear "${source.count.subject}" from the plate? Its ${source.count.tally} wells keep anything else in them.`;
  }
  const { subject, value, unit, source: from } = source.amount;
  if (from.kind === 'wells') {
    const wells = from.keys.length === 1 ? 'well' : `${from.keys.length} wells`;
    return `Remove ${displayValue(value, unit)} of ${subject} from its ${wells}?`;
  }
  return `Remove the ${subject} dilution? Its wells keep the ${subject} label.`;
}

function sourceLines(cell: ValueCell, cards: Protocol['cards']): string[] {
  const card = labwareTitleOf(
    cards,
    cell.linkedTo.kind === 'plate' ? cell.linkedTo.row.plateId : undefined
  );
  if (cell.origin === 'worked') return [];
  if (cell.linkedTo.kind === 'recipe') return ['Changing it here changes the recipe in Materials'];
  if (!cell.isEditable) return [`Counted from ${card}`];
  if (cell.origin === 'plate') return [`Changing it here changes ${card}`];
  if (cell.origin === 'materials') return ['Changing it here changes Materials'];
  return [];
}

const cellsOf = (group: ValueTableGroup) => group.rows.flatMap(row => row.cells);

const neededNoteOf = (neededFor: readonly string[]) =>
  neededFor.length ? neededForText(neededFor) : '';

const typedItemIds = (cells: readonly ValueCell[]) =>
  cells.flatMap(cell =>
    cell.linkedTo.kind === 'item' && cell.origin === 'typed' ? [cell.linkedTo.itemId] : []
  );

function cellViewOf(
  cell: ValueCell,
  used: string,
  isNamed: boolean,
  isNameTaken: boolean,
  cards: Protocol['cards']
): ValueCellView {
  const usageLine = usageTitle(used);
  const neededNote = neededNoteOf(cell.neededFor);
  const mismatch = cell.value.trim() ? unitMismatch(cell.label, cell.unit) : undefined;
  return {
    name: cell.fullName,
    value: cell.value,
    unit: cell.unit,
    units: cell.units,
    hoverLines: [
      cell.fullName,
      ...(isNamed ? [usageLine] : []),
      ...(neededNote ? [neededNote] : []),
      ...(cell.note ? [cell.note] : []),
      ...(mismatch ? [mismatch] : []),
      ...sourceLines(cell, cards),
    ],
    isNeeded: !!neededNote,
    isEditable: cell.isEditable,
    canRemove: cell.canRemove,
    isNameTaken,
    isUsed: !!used || !isNamed,
    isWorked: cell.origin === 'worked',
    workedValue: cell.workedValue ?? '',
    isMismatched: !!cell.isMismatched,
  };
}

const columnSuggestion = (group: ValueTableGroup, column: ValueTableColumn): ValueSuggestion => ({
  kind: 'value',
  name: column.label,
  value: '',
  unit: columnUnit(group, column.key),
  label: column.label,
});

export function WorkbenchValuesPanel({ card }: WorkbenchValuesPanelProps) {
  const protocol = useProtocolWith('values', 'plateMap', 'materials');
  const board = useWorkbenchStore(state => state.board);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);
  const [generalEdit, setGeneralEdit] = useState<GeneralEdit>();
  const [editingCellId, setEditingCellId] = useState<string>();
  const [editingNameRowId, setEditingNameRowId] = useState<string>();
  const [columnEdit, setColumnEdit] = useState<ColumnEdit>();
  const [columnFill, setColumnFill] = useState<ColumnFill>();
  const [fillOfferCellId, setFillOfferCellId] = useState<string>();
  const [addingRowId, setAddingRowId] = useState<string>();
  const [removed, setRemoved] = useState<RemovedValues>();
  const [removingPlateRow, setRemovingPlateRow] = useState<PlateValueRow>();

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(undefined), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const isFirstValuesCard =
    protocol.cards.find(candidate => candidate.type === 'values')?.id === card.id;
  const materials = useMemo(() => materialsById(protocol), [protocol]);
  const plateOffers = useWorkbenchData(state =>
    isFirstValuesCard ? plateNameOffers(state.protocol) : []
  );
  const needs = useMemo(() => valueNeeds(protocol, card, board), [protocol, card, board]);
  const groups = useStructuralSharing(
    useMemo(
      () =>
        buildValueTable(protocol, card, {
          materials,
          board,
          needs,
          unsortedNames: plateOffers.map(offer => offer.name),
        }),
      [protocol, card, materials, board, needs, plateOffers]
    )
  );
  const generalNeeds = useMemo(
    () =>
      isFirstValuesCard
        ? needs.flatMap(need =>
            need.kind === 'absent' && need.routed.destination.kind === 'general' ? [need] : []
          )
        : [],
    [needs, isFirstValuesCard]
  );
  const blankNeeds = useMemo(
    () =>
      new Map(
        needs.flatMap(need => (need.kind === 'blank' ? [[need.id, need.neededFor] as const] : []))
      ),
    [needs]
  );
  const generalItems = useMemo(
    () =>
      valuesInRow(card, WHOLE_EXPERIMENT).flatMap(item => ('materialField' in item ? [] : [item])),
    [card]
  );
  const usageIds = useMemo(
    () => [
      ...generalItems.map(item => item.id),
      ...groups.flatMap(group => cellsOf(group).map(cell => cell.nameId)),
    ],
    [generalItems, groups]
  );
  const usageEntries = useWorkbenchData(state => [
    ...nameUsage(state.protocol, state.board, usageIds),
  ]);
  const usage = useMemo(() => new Map(usageEntries), [usageEntries]);
  const fileFluors = useWorkbenchStore(state => state.protocol.fluors);
  const known = useMemo(
    () => materialKnowledge(memory, { cards: protocol.cards, fluors: fileFluors }),
    [memory, protocol, fileFluors]
  );
  const readings = useWorkbenchData(state =>
    isFirstValuesCard ? readStepReadings(state.protocol, state.board).values : []
  );
  const takenNames = useMemo(() => new Set(board.names.keys()), [board]);
  const namedIds = useMemo(
    () => new Set([...board.names.values()].map(entry => entry.id)),
    [board]
  );

  const usageText = useCallback(
    (nameId: string) => {
      const found = usage.get(nameId);
      return found ? usageSummary(found) : '';
    },
    [usage]
  );
  const viewsByRow = useStructuralSharing(
    useMemo(
      () =>
        Object.fromEntries(
          groups.flatMap(group =>
            group.rows.map(row => [
              row.id,
              Object.fromEntries(
                row.cells.map(cell => [
                  cell.id,
                  cellViewOf(
                    cell,
                    usageText(cell.nameId),
                    namedIds.has(cell.nameId),
                    board.takenNameIds.has(cell.nameId),
                    protocol.cards
                  ),
                ])
              ),
            ])
          )
        ),
      [groups, usageText, namedIds, board.takenNameIds, protocol.cards]
    )
  );
  const generalRows = useStructuralSharing(
    useMemo(
      () =>
        generalItems.map(
          (item): ValueRowData => ({
            id: item.id,
            label: item.name,
            fullName: item.name,
            value: item.value,
            unit: item.unit,
            isNameTaken: board.takenNameIds.has(item.id),
            usage: usageText(item.id),
            neededNote: item.value.trim() ? '' : neededNoteOf(blankNeeds.get(item.id) ?? []),
          })
        ),
      [generalItems, usageText, board.takenNameIds, blankNeeds]
    )
  );

  const edit = (mutate: (draft: Protocol) => void) => updateProtocol(mutate);

  const groupOfRow = (rowId: string) =>
    groups.find(candidate => candidate.rows.some(({ id }) => id === rowId));

  const fillOffer = useMemo(() => {
    if (!fillOfferCellId) return undefined;
    for (const group of groups) {
      const cell = cellsOf(group).find(candidate => candidate.id === fillOfferCellId);
      if (!cell) continue;
      const targets = cell.value.trim() ? fillTargets(group, cell.columnKey) : [];
      return targets.length ? { cell, targets } : undefined;
    }
    return undefined;
  }, [fillOfferCellId, groups]);
  const shownFillOffer: FillOffer | undefined = fillOffer && {
    cellId: fillOffer.cell.id,
    count: fillOffer.targets.length,
  };

  const setGeneralTitle = (title: string) =>
    edit(draft => {
      const target = draft.cards.find(candidate => candidate.id === card.id);
      if (target?.type === 'values') target.generalTitle = title;
    });

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
    edit(draft => restoreValues(draft, card.id, entry));
    setRemoved(undefined);
  };

  const addToRow = (
    row: ValueTableRow,
    change: (draft: Protocol, valueRowId: string) => string | undefined
  ) => {
    let valueRowId: string | undefined;
    let added: string | undefined;
    edit(draft => {
      valueRowId =
        row.valueRow?.id ??
        (row.material ? addValueRow(draft, card.id, row.material.id) : undefined);
      if (valueRowId) added = change(draft, valueRowId);
    });
    return { valueRowId, added };
  };

  const rowSuggestions = (group: ValueTableGroup, row: ValueTableRow): ValueSuggestion[] => {
    const onRow = new Set(row.cells.map(cell => cell.columnKey));
    const fromColumns = group.columns
      .filter(column => column.origin === 'typed' && !onRow.has(column.key))
      .map(column => columnSuggestion(group, column));
    const valueRow = row.valueRow ?? (row.material && { id: row.id, materialId: row.material.id });
    const usual = valueRow ? valueSuggestions(protocol, card, valueRow, row.material) : [];
    const seen = new Set(fromColumns.map(suggestion => normalizeMaterialKey(suggestion.label)));
    return [
      ...fromColumns,
      ...usual.filter(suggestion => !seen.has(normalizeMaterialKey(suggestion.label))),
    ];
  };

  const rowActions = useStableActions<ValueRowActions>({
    onEditCell: cellId => {
      setFillOfferCellId(cellId === undefined ? editingCellId : undefined);
      setEditingCellId(cellId);
    },
    onEditName: setEditingNameRowId,
    onRename: (row, name) => {
      const { valueRow } = row;
      if (valueRow) edit(draft => renameValueRow(draft, card.id, valueRow.id, name));
    },
    onToggleAdd: rowId => setAddingRowId(current => (current === rowId ? undefined : rowId)),
    onFillColumn: (row, column) => {
      const group = groupOfRow(row.id);
      if (!group) return;
      let added: string | undefined;
      edit(draft => {
        added = addRoutedValue(draft, card.id, slotRoute(group, row, column));
      });
      setEditingCellId(added);
    },
    onAddNeeded: (row, cell) => {
      const group = groupOfRow(row.id);
      if (!group || cell.linkedTo.kind !== 'need') return;
      const { routed } = cell.linkedTo;
      const unit = columnUnit(group, cell.columnKey);
      let added: string | undefined;
      edit(draft => {
        added = addRoutedValue(draft, card.id, { ...routed, line: { ...routed.line, unit } });
      });
      setEditingCellId(added);
    },
    onFillOthers: () => {
      if (!fillOffer) return;
      const { cell, targets } = fillOffer;
      edit(draft => fillBlanks(draft, card.id, targets, cell.value, cell.unit));
      setFillOfferCellId(undefined);
    },
    onValueChange: (cell, value) => edit(draft => writeCellValue(draft, card.id, cell, value)),
    onUnitChange: (cell, unit) => edit(draft => writeCellUnit(draft, card.id, cell, unit)),
    onRemoveCell: cell => {
      const { linkedTo: source } = cell;
      if (source.kind === 'item') {
        remove(draft => removeValue(draft, card.id, source.itemId));
      } else if (source.kind === 'plate') {
        setEditingCellId(undefined);
        setRemovingPlateRow(source.row);
      }
    },
    onRemoveRow: row => {
      const { valueRow } = row;
      if (valueRow) remove(draft => removeValueRow(draft, card.id, valueRow.id));
    },
  });

  const columnActions = useStableActions<ValueColumnActions>({
    onEditColumn: (groupKey, column) => {
      const group = groups.find(candidate => candidate.key === groupKey);
      setColumnEdit(
        column &&
          group && {
            groupKey,
            itemIds: typedItemIds(cellsOf(group).filter(cell => cell.columnKey === column.key)),
          }
      );
    },
    onRenameColumn: name => {
      const itemIds = columnEdit?.itemIds ?? [];
      edit(draft => {
        for (const itemId of itemIds) renameValue(draft, card.id, itemId, name);
      });
    },
    onStartFill: (groupKey, column) => setColumnFill(column && { groupKey, columnKey: column.key }),
    onFillBlanks: (groupKey, column, value, unit) => {
      const group = groups.find(candidate => candidate.key === groupKey);
      setColumnFill(undefined);
      if (!group) return;
      edit(draft => fillBlanks(draft, card.id, fillTargets(group, column.key), value, unit));
    },
  });

  const renderAdder = (group: ValueTableGroup, row: ValueTableRow) => (
    <WorkbenchValueAddField
      placeholder={`Add to ${row.shownName || 'this mix'}: ${VOLUME_PER_WELL.word} 50 µL`}
      guessFor={text => rowValueGuess(text, row.name, takenNames)}
      suggestions={rowSuggestions(group, row)}
      isFocusedOnMount
      onAddLines={lines => {
        const { valueRowId, added } = addToRow(row, (draft, id) =>
          addValueLines(draft, card.id, lines, id)
        );
        setAddingRowId(valueRowId);
        if (added) setEditingCellId(added);
      }}
      onSuggest={suggestion => {
        const { added } = addToRow(row, (draft, valueRowId) =>
          addSuggestedValue(draft, card.id, valueRowId, suggestion)
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

  const generalActions = useStableActions<GeneralValueActions>({
    onEdit: (itemId, cell) => setGeneralEdit(cell ? { itemId, cell } : undefined),
    onMoveEdit: (itemId, cell, step) => {
      const cells = generalItems.flatMap(item =>
        (['name', 'value'] as const).map(next => ({ itemId: item.id, cell: next }))
      );
      const at = cells.findIndex(
        candidate => candidate.itemId === itemId && candidate.cell === cell
      );
      setGeneralEdit(cells[at + step]);
    },
    onRename: (itemId, name) => edit(draft => renameValue(draft, card.id, itemId, name)),
    onValueChange: (itemId, value) => edit(draft => setValueAmount(draft, card.id, itemId, value)),
    onUnitChange: (itemId, unit) => edit(draft => setValueUnit(draft, card.id, itemId, unit)),
    onRemove: itemId => remove(draft => removeValue(draft, card.id, itemId)),
  });

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="mb-6 px-2 pt-2">
        <WorkbenchValueAddField
          variant="bar"
          placeholder={`e.g. ${TOTAL_WELL_VOLUME.word} 80 µL, or paste a list`}
          guessFor={text => {
            const routed = routeValueLine(protocol, card, text);
            return routed && routedValueGuess(routed, takenNames);
          }}
          onAddLines={lines => {
            const routed = lines.flatMap(line => routeValueLine(protocol, card, line) ?? []);
            let added: string | undefined;
            edit(draft => {
              for (const value of routed) added = addRoutedValue(draft, card.id, value);
            });
            const [only] = routed;
            if (routed.length !== 1 || only.line.value || !added) return;
            if (only.destination.kind === 'general')
              setGeneralEdit({ itemId: added, cell: 'value' });
            else setEditingCellId(added);
          }}
        />
      </div>
      {plateOffers.length > 0 && (
        <div className="mb-6 px-2">
          <WorkbenchMaterialPlateNamesSection offers={plateOffers} />
        </div>
      )}
      <WorkbenchValueSection
        title={
          groups.length > 0 ? (
            <span className="inline-edit">
              <input
                value={card.generalTitle ?? WHOLE_EXPERIMENT_TITLE}
                placeholder="Name this row"
                aria-label="Row name"
                spellCheck={false}
                className={`${TITLE_INPUT} uppercase`}
                onChange={event => setGeneralTitle(event.target.value)}
                onBlur={event => {
                  const converted = withGreekLetters(event.target.value);
                  if (converted !== event.target.value) setGeneralTitle(converted);
                }}
              />
            </span>
          ) : (
            ''
          )
        }
      >
        {generalRows.map(row => (
          <WorkbenchValueItem
            key={row.id}
            row={row}
            editingCell={generalEdit?.itemId === row.id ? generalEdit.cell : undefined}
            actions={generalActions}
          />
        ))}
        {generalNeeds.map(need => (
          <WorkbenchValueNeededRow
            key={need.routed.fullName}
            name={need.routed.line.name}
            neededNote={neededForText(need.neededFor)}
            onAdd={() => {
              let added: string | undefined;
              edit(draft => {
                added = addRoutedValue(draft, card.id, need.routed);
              });
              if (added) setGeneralEdit({ itemId: added, cell: 'value' });
            }}
          />
        ))}
      </WorkbenchValueSection>
      {!generalRows.length && !generalNeeds.length && !groups.length && (
        <PanelEmptyState
          icon={CARD_ICONS.values}
          message="Add values above"
          description="Type a name and amount, or paste a list"
        />
      )}
      <div className="mt-5 flex flex-col gap-5">
        {groups.map(group => (
          <WorkbenchValueGroupTable
            key={group.key}
            group={group}
            viewsByRow={viewsByRow}
            editingCellId={editingCellId}
            editingNameRowId={editingNameRowId}
            editingColumnKey={editingColumnKey(group)}
            fillingColumnKey={columnFill?.groupKey === group.key ? columnFill.columnKey : undefined}
            fillOffer={shownFillOffer}
            addingRowId={addingRowId}
            actions={rowActions}
            columnActions={columnActions}
            renderAdder={row => renderAdder(group, row)}
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
                  materialFromGuess(guessMaterial(name, known), memory)
                )
              )
            }
            onIgnore={reading =>
              edit(draft => {
                draft.ignoredSuggestions.push(reading.key);
              })
            }
          />
        </div>
      )}
      <div className="mt-4 px-2">
        <Button
          variant="ghost"
          size="xs"
          leftIcon={<Plus aria-hidden className={ADD_ICON} />}
          onClick={() => {
            let added: string | undefined;
            edit(draft => {
              added = addValueRow(draft, card.id, undefined);
            });
            setEditingNameRowId(added);
          }}
        >
          Add mix
        </Button>
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
