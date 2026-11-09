import { useEffect, useMemo, useState } from 'react';

import { Button, Select, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameUsage, usageSummary } from '../../../../utils/formulas/nameUsage';
import { displayValue } from '../../../../utils/formulas/quantities';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import { materialFromGuess } from '../../../../utils/materials/materialItems';
import { rememberedKinds } from '../../../../utils/materials/materialMemory';
import { acceptStepReadings, readStepReadings } from '../../../../utils/steps/stepReadings';
import {
  canRemovePlateRow,
  labelInSection,
  plateValueRows,
  removePlateRow,
  renamePlateRow,
  setPlateRowUnit,
  setPlateRowValue,
  type PlateValueRow,
} from '../../../../utils/values/plateValueRows';
import {
  addSuggestedValue,
  addValueLines,
  addValueSection,
  linkedValueOf,
  materialsById,
  removeValue,
  removeValueSection,
  renameValue,
  renameValueSection,
  restoreValues,
  sectionName,
  sectionPeers,
  setValueAmount,
  setValueUnit,
  type RemovedValues,
} from '../../../../utils/values/valueEdits';
import { joinValueName } from '../../../../utils/values/valueNames';
import { valueSectionChoices, valueSuggestions } from '../../../../utils/values/valueSuggestions';

import { WorkbenchValueReadingsSection } from './WorkbenchValueReadingsSection';
import { WorkbenchValueRow, type ValueCell, type ValueRowData } from './WorkbenchValueRow';
import { WorkbenchValueSection } from './WorkbenchValueSection';

import type { Protocol, ValuesBlock } from '@odysseus/shared-schemas';

interface WorkbenchValuesPanelProps {
  block: ValuesBlock;
}

interface CellEdit {
  itemId: string;
  cell: ValueCell;
}

const UNDO_MS = 8000;
const GENERAL_SECTION = '';
const MIX_CHOICE = 'mix';
const TITLE_INPUT =
  '[field-sizing:content] min-w-[4ch] bg-transparent type-label text-label-md font-semibold text-foreground outline-none placeholder:text-muted-foreground';

function plateRemovalMessage(row: PlateValueRow): string {
  const { source } = row;
  if (source.kind === 'count') {
    return `Clear “${row.name}” from the plate? Its ${source.count.tally} wells keep anything else in them.`;
  }
  const { subject, value, unit, source: from } = source.amount;
  if (from.kind === 'wells') {
    const wells = from.keys.length === 1 ? 'well' : `${from.keys.length} wells`;
    return `Remove ${displayValue(value, unit)} of ${subject} from its ${wells}?`;
  }
  return `Remove the ${subject} dilution? Its wells keep the ${subject} label.`;
}

export function WorkbenchValuesPanel({ block }: WorkbenchValuesPanelProps) {
  const protocol = useWorkbenchStore(state => state.protocol);
  const calculation = useWorkbenchStore(state => state.calculation);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const [editing, setEditing] = useState<CellEdit>();
  const [removed, setRemoved] = useState<RemovedValues>();

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(undefined), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const materials = useMemo(() => materialsById(protocol), [protocol]);

  const rows = useMemo(() => {
    const usageIdOf = (item: ValuesBlock['items'][number]) => {
      const linked = linkedValueOf(block, item, materials);
      return linked ? `${linked.material.id}:${linked.field.key}` : item.id;
    };
    const usage = nameUsage(protocol, calculation, block.items.map(usageIdOf));
    return new Map(
      block.items.flatMap((item): Array<[string, ValueRowData]> => {
        const linked = linkedValueOf(block, item, materials);
        if ('materialField' in item && !linked) return [];
        const section = block.sections.find(candidate => candidate.id === item.section);
        const owner = section ? sectionName(section, materials) : undefined;
        const ownName = linked ? linked.name : 'name' in item ? item.name : '';
        const isStandalone = !!linked || owner === undefined;
        const fullName = isStandalone ? ownName : joinValueName(owner, ownName);
        const usageOfItem = usage.get(usageIdOf(item));
        return [
          [
            item.id,
            {
              id: item.id,
              label: linked ? linked.label : ownName,
              fullName,
              value: linked ? linked.value : 'value' in item ? item.value : '',
              unit: linked ? linked.unit : 'unit' in item ? item.unit : '',
              units: linked ? linked.units : undefined,
              tag: linked ? 'in Materials' : undefined,
              isValueEditable: true,
              canRemove: true,
              isDuplicate: calculation.duplicateIds.has(item.id),
              usage: usageOfItem ? usageSummary(usageOfItem) : '',
            },
          ],
        ];
      })
    );
  }, [block, calculation, materials, protocol]);

  const plateRows = useMemo(
    () => plateValueRows(protocol, block, materials),
    [protocol, block, materials]
  );
  const plateUsage = useMemo(
    () =>
      nameUsage(
        protocol,
        calculation,
        plateRows.map(row => row.id)
      ),
    [protocol, calculation, plateRows]
  );
  const [removingPlateRow, setRemovingPlateRow] = useState<PlateValueRow>();
  const memory = useMaterialMemoryStore(state => state.memory);
  const remembered = useMemo(() => rememberedKinds(memory, protocol), [memory, protocol]);
  const isFirstValuesBlock =
    protocol.blocks.find(candidate => candidate.type === 'values')?.id === block.id;
  const readings = useMemo(
    () => (isFirstValuesBlock ? readStepReadings(protocol, calculation).values : []),
    [isFirstValuesBlock, protocol, calculation]
  );

  const takenNames = useMemo(() => new Set(calculation.names.keys()), [calculation]);

  const edit = (mutate: (draft: Protocol) => void) => updateProtocol(mutate);

  const addLines = (sectionId: string, lines: string[]) => {
    let needsNumber: string | undefined;
    edit(draft => {
      needsNumber = addValueLines(draft, block.id, lines, sectionId);
    });
    if (needsNumber) setEditing({ itemId: needsNumber, cell: 'value' });
  };

  const moveEdit = (sectionId: string, itemId: string, cell: ValueCell, step: 1 | -1) => {
    const cells = sectionPeers(block, sectionId)
      .filter(item => rows.has(item.id))
      .flatMap(item => (['name', 'value'] as const).map(next => ({ itemId: item.id, cell: next })));
    const at = cells.findIndex(candidate => candidate.itemId === itemId && candidate.cell === cell);
    setEditing(cells[at + step]);
  };

  const remove = (mutate: (draft: Protocol) => RemovedValues | undefined) => {
    let entry: RemovedValues | undefined;
    edit(draft => {
      entry = mutate(draft);
    });
    setEditing(undefined);
    setRemoved(entry);
  };

  const undo = () => {
    if (!removed) return;
    const entry = removed;
    edit(draft => restoreValues(draft, block.id, entry));
    setRemoved(undefined);
  };

  const undoLabelFor = (sectionId: string) => {
    if (removed?.kind !== 'item' || (removed.item.section ?? '') !== sectionId) return undefined;
    return removed.label;
  };

  const plateRowData = (row: PlateValueRow, ownerName: string): ValueRowData => {
    const { source } = row;
    const usageOfRow = plateUsage.get(row.id);
    const shared = {
      id: row.id,
      label: labelInSection(row.name, ownerName),
      fullName: row.name,
      isDuplicate: calculation.duplicateIds.has(row.id),
      usage: usageOfRow ? usageSummary(usageOfRow) : '',
      canRemove: canRemovePlateRow(row),
    };
    if (source.kind === 'count') {
      const { count } = source;
      return {
        ...shared,
        value: String(count.count),
        unit: '',
        units: [],
        tag: count.count === count.tally ? 'on the plate' : `map has ${count.tally}`,
        isValueEditable: count.kind !== 'total',
      };
    }
    const from = source.amount.source;
    return {
      ...shared,
      value: source.amount.value,
      unit: source.amount.unit,
      units:
        from.kind === 'points'
          ? []
          : from.kind === 'series' && from.field === 'fold'
            ? ['X']
            : undefined,
      tag: 'on the plate',
      isValueEditable: from.kind !== 'points',
    };
  };

  const renderPlateRows = (sectionId: string, ownerName: string) =>
    plateRows
      .filter(row => row.sectionId === sectionId)
      .map(row => (
        <WorkbenchValueRow
          key={row.id}
          row={plateRowData(row, ownerName)}
          editingCell={editing?.itemId === row.id ? editing.cell : undefined}
          onEdit={cell => setEditing(cell ? { itemId: row.id, cell } : undefined)}
          onMoveEdit={() => setEditing(undefined)}
          onRename={name => edit(draft => renamePlateRow(draft, row, name, ownerName))}
          onValueChange={value => edit(draft => setPlateRowValue(draft, row, value))}
          onUnitChange={unit => edit(draft => setPlateRowUnit(draft, row, unit))}
          onRemove={() => setRemovingPlateRow(row)}
        />
      ));

  const renderRows = (sectionId: string) =>
    sectionPeers(block, sectionId).flatMap(item => {
      const row = rows.get(item.id);
      if (!row) return [];
      return [
        <WorkbenchValueRow
          key={item.id}
          row={row}
          editingCell={editing?.itemId === item.id ? editing.cell : undefined}
          onEdit={cell => setEditing(cell ? { itemId: item.id, cell } : undefined)}
          onMoveEdit={(cell, step) => moveEdit(sectionId, item.id, cell, step)}
          onRename={name => edit(draft => renameValue(draft, block.id, item.id, name))}
          onValueChange={value => edit(draft => setValueAmount(draft, block.id, item.id, value))}
          onUnitChange={unit => edit(draft => setValueUnit(draft, block.id, item.id, unit))}
          onRemove={() => remove(draft => removeValue(draft, block.id, item.id))}
        />,
      ];
    });

  const sectionChoices = valueSectionChoices(protocol, block);
  const hasSections = block.sections.length > 0;

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-x-6 gap-y-5">
        <WorkbenchValueSection
          title={
            hasSections ? (
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
          kind=""
          ownerName=""
          addPlaceholder="Add: Incubation 24 h"
          takenNames={takenNames}
          undoLabel={undoLabelFor(GENERAL_SECTION)}
          isEmpty={
            !sectionPeers(block, GENERAL_SECTION).length &&
            !plateRows.some(row => row.sectionId === GENERAL_SECTION)
          }
          onAddLines={lines => addLines(GENERAL_SECTION, lines)}
          onUndo={undo}
        >
          {renderPlateRows(GENERAL_SECTION, '')}
          {renderRows(GENERAL_SECTION)}
        </WorkbenchValueSection>
        {block.sections.map(section => {
          const material = 'materialId' in section ? materials.get(section.materialId) : undefined;
          const name = sectionName(section, materials);
          const kind =
            'mixName' in section
              ? 'Mix'
              : !material
                ? 'No longer in Materials'
                : material.isDropped
                  ? `${material.type} · dropped`
                  : material.type;
          const isEditableName = 'mixName' in section || !!material;
          return (
            <WorkbenchValueSection
              key={section.id}
              title={
                isEditableName ? (
                  <Tooltip content={material ? 'Renames it in Materials too' : undefined}>
                    <input
                      value={'mixName' in section ? section.mixName : (material?.name ?? '')}
                      placeholder={'mixName' in section ? 'Name this mix' : 'Name'}
                      aria-label="Section name"
                      spellCheck={false}
                      className={TITLE_INPUT}
                      onChange={event =>
                        edit(draft =>
                          renameValueSection(draft, block.id, section.id, event.target.value)
                        )
                      }
                    />
                  </Tooltip>
                ) : (
                  name
                )
              }
              kind={kind}
              ownerName={name}
              addPlaceholder={`Add to ${name || 'this mix'}`}
              suggestions={valueSuggestions(protocol, block, section, material)}
              takenNames={takenNames}
              undoLabel={undoLabelFor(section.id)}
              isEmpty={
                !sectionPeers(block, section.id).length &&
                !plateRows.some(row => row.sectionId === section.id)
              }
              onAddLines={lines => addLines(section.id, lines)}
              onSuggest={suggestion => {
                let added: string | undefined;
                edit(draft => {
                  added = addSuggestedValue(draft, block.id, section.id, suggestion);
                });
                if (added) setEditing({ itemId: added, cell: 'value' });
              }}
              onRemoveSection={() =>
                remove(draft => removeValueSection(draft, block.id, section.id))
              }
              onUndo={undo}
            >
              {renderPlateRows(section.id, name)}
              {renderRows(section.id)}
            </WorkbenchValueSection>
          );
        })}
        {readings.length > 0 && (
          <WorkbenchValueReadingsSection
            readings={readings}
            onAccept={accepted =>
              edit(draft =>
                acceptStepReadings(draft, { values: accepted }, name =>
                  materialFromGuess(guessMaterial(name, remembered), memory.materials)
                )
              )
            }
            onIgnore={reading =>
              edit(draft => {
                draft.ignoredReadings.push(reading.key);
              })
            }
          />
        )}
        {removed?.kind === 'section' && (
          <p className="flex items-center gap-2 px-2 text-body-sm text-muted-foreground">
            Removed {removed.label}
            <Button variant="ghost" size="xs" onClick={undo}>
              Undo
            </Button>
          </p>
        )}
      </div>
      <div className="mt-4 max-w-xs px-2">
        <Select
          size="sm"
          value=""
          placeholder="+ Values for…"
          aria-label="Add values for a material or mix"
          options={[...sectionChoices, { value: MIX_CHOICE, label: 'A mix or cocktail' }]}
          onChange={choice => {
            if (choice === null || choice === '') return;
            edit(draft => {
              addValueSection(draft, block.id, choice === MIX_CHOICE ? undefined : String(choice));
            });
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
