import { useCallback, useEffect, useMemo, useState } from 'react';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameUsage } from '../../../../utils/formulas/nameUsage';
import { materialGroup, materialGroupsOf } from '../../../../utils/materials/materialCatalog';
import { conjugateClashes } from '../../../../utils/materials/materialClashes';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import {
  OTHER_TYPE,
  UNSORTED_GROUP,
  applyMaterialKind,
  copyMaterialField,
  materialColumns,
  materialFromGuess,
  writeMaterialField,
} from '../../../../utils/materials/materialItems';
import { ensureMaterial, listedMaterials } from '../../../../utils/materials/materialLookup';
import {
  LOT_FIELD,
  fillFromLotMemory,
  rememberLotValue,
} from '../../../../utils/materials/materialLots';
import { rememberedKinds } from '../../../../utils/materials/materialMemory';
import {
  addRecipeLine,
  editRecipeEntry,
  recipeLines,
  recipesUsing,
  removeRecipeEntry,
} from '../../../../utils/materials/materialRecipe';
import {
  addCustomSectionField,
  fieldChoices,
  hideSectionField,
  toggleSectionField,
} from '../../../../utils/materials/materialSectionFields';
import { fieldSuggestions } from '../../../../utils/materials/materialSuggestions';
import {
  linkPlateName,
  plateNameOffers,
  type PlateNameOffer,
} from '../../../../utils/materials/plateNameOffers';
import {
  acceptStepReadings,
  readStepReadings,
  type MaterialReading,
} from '../../../../utils/steps/stepReadings';
import { materialsById } from '../../../../utils/values/valueEdits';
import { materialWellCounts } from '../../../../utils/vessels/vesselMapNames';

import { useMaterialAdding } from './useMaterialAdding';
import { useMaterialCellEditing, type MaterialCell } from './useMaterialCellEditing';
import { useMaterialRemoval } from './useMaterialRemoval';
import { WorkbenchMaterialAddBar, type NewGroupTarget } from './WorkbenchMaterialAddBar';
import { WorkbenchMaterialDroppedSection } from './WorkbenchMaterialDroppedSection';
import { WorkbenchMaterialGroupDialog } from './WorkbenchMaterialGroupDialog';
import { WorkbenchMaterialPlateNamesSection } from './WorkbenchMaterialPlateNamesSection';
import { WorkbenchMaterialReadingsSection } from './WorkbenchMaterialReadingsSection';
import { WorkbenchMaterialSection } from './WorkbenchMaterialSection';
import { WorkbenchMaterialTable } from './WorkbenchMaterialTable';

import type { MaterialKind } from './materialSelectOptions';
import type { MaterialRowActions } from './WorkbenchMaterialRow';
import type { MaterialItem, MaterialsBlock, Protocol } from '@odysseus/shared-schemas';

interface WorkbenchMaterialsPanelProps {
  block: MaterialsBlock;
}

type GroupDialogTarget = NewGroupTarget | { place: 'item'; itemId: string };

interface FieldMenuState {
  group: string;
  query: string;
}

const LEARN_DELAY_MS = 250;
const ANTIBODY_GROUP = 'ab';
const FIXED_CELLS = ['name', 'type'];

export function WorkbenchMaterialsPanel({ block }: WorkbenchMaterialsPanelProps) {
  const protocol = useWorkbenchStore(state => state.protocol);
  const calculation = useWorkbenchStore(state => state.calculation);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const updateBlock = useUpdateBlock(block);
  const memory = useMaterialMemoryStore(state => state.memory);
  const rememberKind = useMaterialMemoryStore(state => state.rememberKind);
  const learnFromMaterials = useMaterialMemoryStore(state => state.learnFromMaterials);
  const [fresh, setFresh] = useState({ ids: new Set<string>(), stamp: 0 });
  const [fieldMenu, setFieldMenu] = useState<FieldMenuState>();
  const [groupDialogTarget, setGroupDialogTarget] = useState<GroupDialogTarget>();

  const markFresh = useCallback(
    (ids: readonly string[]) =>
      setFresh(current => ({ ids: new Set(ids), stamp: current.stamp + 1 })),
    []
  );
  const remembered = useMemo(() => rememberedKinds(memory, protocol), [memory, protocol]);
  const adding = useMaterialAdding(block, remembered, markFresh);
  const removal = useMaterialRemoval(block, id => markFresh([id]));
  const { removed } = removal;

  useEffect(() => {
    const timer = setTimeout(() => learnFromMaterials(block.items), LEARN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [block.items, learnFromMaterials]);

  const sections = useMemo(
    () =>
      materialGroupsOf(block.customGroups)
        .map(group => {
          const items = block.items.filter(item => item.group === group.key && !item.isDropped);
          return {
            group,
            items,
            columns: materialColumns(items),
            clashes: group.key === ANTIBODY_GROUP ? conjugateClashes(items) : [],
            isFolded: block.foldedGroups.includes(group.key),
            removed:
              removed && !removed.isFromDropped && removed.item.group === group.key
                ? removed
                : undefined,
          };
        })
        .filter(section => section.items.length || section.removed)
        .sort(
          (x, y) => Number(y.group.key === UNSORTED_GROUP) - Number(x.group.key === UNSORTED_GROUP)
        ),
    [block.items, block.customGroups, block.foldedGroups, removed]
  );
  const droppedItems = block.items.filter(item => item.isDropped);
  const usage = useMemo(
    () =>
      nameUsage(
        protocol,
        calculation,
        block.items.map(item => item.id)
      ),
    [protocol, calculation, block.items]
  );
  const isFirstMaterialsBlock =
    protocol.blocks.find(candidate => candidate.type === 'materials')?.id === block.id;
  const readings = useMemo(
    () => (isFirstMaterialsBlock ? readStepReadings(protocol, calculation).materials : []),
    [isFirstMaterialsBlock, protocol, calculation]
  );
  const allMaterials = useMemo(() => materialsById(protocol), [protocol]);
  const recipeUsers = useMemo(() => recipesUsing([...allMaterials.values()]), [allMaterials]);
  const plateWells = useMemo(() => {
    const vesselMaps = protocol.blocks.filter(candidate => candidate.type === 'plate');
    const counts = materialWellCounts(vesselMaps, [...allMaterials.values()]);
    return new Map([...counts].map(([material, count]) => [material.id, count]));
  }, [protocol, allMaterials]);
  const plateOffers = useMemo(
    () => (isFirstMaterialsBlock ? plateNameOffers(protocol) : []),
    [isFirstMaterialsBlock, protocol]
  );
  const linkChoices = useMemo(
    () =>
      listedMaterials(protocol).map(item => ({
        value: item.id,
        label: item.name,
        group: materialGroup(item.group).label,
      })),
    [protocol]
  );
  const cellOrder = useMemo(
    () =>
      sections
        .filter(section => !section.isFolded)
        .flatMap(section =>
          section.items.flatMap(item =>
            [...FIXED_CELLS, ...section.columns.map(column => column.key)].map(key => ({
              itemId: item.id,
              key,
            }))
          )
        ),
    [sections]
  );

  const updateItem = useCallback(
    (itemId: string, recipe: (item: MaterialItem, draft: Protocol) => void) =>
      updateProtocol(draft => {
        const target = draft.blocks.find(candidate => candidate.id === block.id);
        const item =
          target?.type === 'materials' ? target.items.find(i => i.id === itemId) : undefined;
        if (item) recipe(item, draft);
      }),
    [block.id, updateProtocol]
  );

  const fillLot = useCallback(
    (cell: MaterialCell) => {
      if (cell.key === LOT_FIELD) {
        updateItem(cell.itemId, (item, draft) => fillFromLotMemory(draft.lotMemory, item));
      }
    },
    [updateItem]
  );
  const editing = useMaterialCellEditing(cellOrder, fillLot);

  const setItemKind = (itemId: string, { group, type }: MaterialKind) => {
    const name = block.items.find(item => item.id === itemId)?.name ?? '';
    updateItem(itemId, item => applyMaterialKind(item, group, type));
    rememberKind(name, group, type);
    editing.stop();
  };

  const rowActions: MaterialRowActions = {
    rename: (itemId, name) =>
      updateItem(itemId, item => {
        item.name = name;
      }),
    writeField: (itemId, definition, value) =>
      updateItem(itemId, (item, draft) => {
        writeMaterialField(item, definition, value);
        if (definition.scope === 'lot') {
          rememberLotValue(draft.lotMemory, item, definition.key, value);
        }
      }),
    setUnit: (itemId, key, unit) =>
      updateItem(itemId, item => {
        item.units[key] = unit;
      }),
    chooseKind: setItemKind,
    requestNewGroup: itemId => setGroupDialogTarget({ place: 'item', itemId }),
    fillDown: (item, source, key) => {
      if (key === 'type') {
        updateItem(item.id, draft => applyMaterialKind(draft, source.group, source.type));
        rememberKind(item.name, source.group, source.type);
      } else {
        updateItem(item.id, draft => copyMaterialField(draft, source, key));
      }
    },
    suggest: (itemId, key, typed) => fieldSuggestions(protocol, key, typed, itemId),
    drop: item => {
      editing.stop();
      removal.drop(item);
    },
    remove: item => {
      editing.stop();
      removal.remove(item);
    },
    addRecipeLine: (itemId, text) =>
      updateProtocol(draft =>
        addRecipeLine(draft, itemId, text, name =>
          materialFromGuess(guessMaterial(name, remembered), memory.materials)
        )
      ),
    editRecipeEntry: (itemId, entryId, change) =>
      updateProtocol(draft => editRecipeEntry(draft, itemId, entryId, change)),
    removeRecipeEntry: (itemId, entryId) =>
      updateProtocol(draft => removeRecipeEntry(draft, itemId, entryId)),
  };

  const updateGroupItems = (group: string, recipe: (items: MaterialItem[]) => void) =>
    updateBlock(draft => recipe(draft.items.filter(item => item.group === group)));

  const toggleFold = (group: string) =>
    updateBlock(draft => {
      draft.foldedGroups = draft.foldedGroups.includes(group)
        ? draft.foldedGroups.filter(folded => folded !== group)
        : [...draft.foldedGroups, group];
    });

  const acceptReadings = (accepted: readonly MaterialReading[]) =>
    updateProtocol(draft =>
      acceptStepReadings(draft, { materials: accepted }, name =>
        materialFromGuess(guessMaterial(name, remembered), memory.materials)
      )
    );

  const addPlateNames = (offers: readonly PlateNameOffer[]) =>
    updateProtocol(draft => {
      for (const offer of offers) {
        ensureMaterial(draft, offer.name, name =>
          materialFromGuess(guessMaterial(name, remembered), memory.materials)
        );
      }
    });

  const createGroup = (label: string) => {
    const target = groupDialogTarget;
    setGroupDialogTarget(undefined);
    const trimmed = label.trim();
    if (!target || !trimmed) return;
    const sameLabel = (candidate: { label: string }) =>
      candidate.label.toLowerCase() === trimmed.toLowerCase();
    if (!materialGroupsOf(block.customGroups).some(sameLabel)) {
      updateBlock(draft => {
        draft.customGroups.push(trimmed);
      });
    }
    const group = materialGroupsOf([...block.customGroups, trimmed]).find(sameLabel);
    if (!group) return;
    const kind = { group: group.key, type: OTHER_TYPE };
    if (target.place === 'guess') adding.chooseKind(kind);
    else if (target.place === 'paste') adding.setPasteRowKind(target.index, kind);
    else setItemKind(target.itemId, kind);
  };

  return (
    <div className="px-4 py-3">
      <WorkbenchMaterialAddBar
        adding={adding}
        items={block.items}
        customGroups={block.customGroups}
        onNewGroup={setGroupDialogTarget}
      />
      <div className="space-y-7">
        {sections.length ? (
          sections.map(section => {
            const { key } = section.group;
            const query = fieldMenu?.group === key ? fieldMenu.query : '';
            return (
              <WorkbenchMaterialSection
                key={key}
                title={section.group.label}
                count={section.items.length}
                isFolded={section.isFolded}
                onToggleFold={() => toggleFold(key)}
              >
                <WorkbenchMaterialTable
                  items={section.items}
                  columns={section.columns}
                  clashes={section.clashes}
                  customGroups={block.customGroups}
                  usage={usage}
                  recipeOf={item => recipeLines(item, allMaterials)}
                  recipeUsers={recipeUsers}
                  plateWells={plateWells}
                  duplicateIds={calculation.duplicateIds}
                  fresh={fresh}
                  removed={section.removed}
                  editing={editing}
                  actions={rowActions}
                  fieldMenu={{
                    isOpen: fieldMenu?.group === key,
                    choices: fieldChoices(
                      section.items,
                      new Set(section.columns.map(column => column.key)),
                      memory
                    ),
                    query,
                    onToggleOpen: () =>
                      setFieldMenu(current =>
                        current?.group === key ? undefined : { group: key, query: '' }
                      ),
                    onQueryChange: next => setFieldMenu({ group: key, query: next }),
                    onToggle: fieldKey =>
                      updateGroupItems(key, items => toggleSectionField(items, fieldKey, memory)),
                    onAddCustom: () => {
                      if (!query.trim()) return;
                      updateGroupItems(key, items => addCustomSectionField(items, query.trim()));
                      setFieldMenu({ group: key, query: '' });
                    },
                    onClose: () => setFieldMenu(undefined),
                  }}
                  onHideColumn={fieldKey =>
                    updateGroupItems(key, items => hideSectionField(items, fieldKey))
                  }
                  onUndo={removal.undo}
                />
              </WorkbenchMaterialSection>
            );
          })
        ) : (
          <p className="text-body-sm italic text-muted-foreground">
            Nothing yet. Type a material above; a name is enough.
          </p>
        )}
        {readings.length > 0 && (
          <WorkbenchMaterialReadingsSection
            readings={readings}
            guessType={name => guessMaterial(name, remembered).type}
            onAccept={acceptReadings}
            onIgnore={reading =>
              updateProtocol(draft => {
                draft.ignoredReadings.push(reading.key);
              })
            }
          />
        )}
        {plateOffers.length > 0 && (
          <WorkbenchMaterialPlateNamesSection
            offers={plateOffers}
            materialChoices={linkChoices}
            guessType={name => guessMaterial(name, remembered).type}
            onAdd={addPlateNames}
            onLink={(offer, materialId) =>
              updateProtocol(draft => linkPlateName(draft, offer.name, materialId))
            }
            onIgnore={offer =>
              updateProtocol(draft => {
                draft.ignoredReadings.push(offer.key);
              })
            }
          />
        )}
        {(droppedItems.length > 0 || removed?.isFromDropped) && (
          <WorkbenchMaterialDroppedSection
            items={droppedItems}
            usage={usage}
            isOpen={block.isDroppedOpen}
            removed={removed?.isFromDropped ? removed : undefined}
            onToggleOpen={() =>
              updateBlock(draft => {
                draft.isDroppedOpen = !draft.isDroppedOpen;
              })
            }
            onRestore={removal.restoreDropped}
            onRemove={rowActions.remove}
            onUndo={removal.undo}
          />
        )}
      </div>
      <WorkbenchMaterialGroupDialog
        isOpen={!!groupDialogTarget}
        onCreate={createGroup}
        onCancel={() => setGroupDialogTarget(undefined)}
      />
    </div>
  );
}
