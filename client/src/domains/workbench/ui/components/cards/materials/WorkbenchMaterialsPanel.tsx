import { useCallback, useEffect, useMemo, useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';
import { FlaskConical } from 'lucide-react';

import { PanelEmptyState } from '@shared/ui';

import { useFluorCatalog } from '../../../../hooks/useFluorCatalog';
import { useStableActions } from '../../../../hooks/useStableActions';
import { useUpdateCard } from '../../../../hooks/useUpdateCard';
import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { diluentUses } from '../../../../utils/dilutions/dilutionDiluents';
import { panelDetectorLabels } from '../../../../utils/flowCytometry/flowCytometryPanel';
import { keepFluorInFile } from '../../../../utils/fluors/fileFluors';
import { resolveFluor } from '../../../../utils/fluors/fluorPicks';
import { nameUsage } from '../../../../utils/formulas/nameUsage';
import {
  CONJUGATE_FIELD,
  conjugateConflicts,
} from '../../../../utils/materials/conjugateConflicts';
import {
  ANTIBODY_GROUP,
  materialFields,
  materialGroupsOf,
} from '../../../../utils/materials/materialCatalog';
import {
  DONORS_LABEL,
  addCustomDonorField,
  addDonor,
  addDonorsNamed,
  donorTargetsOf,
  moveIntoDonors,
  donorFieldChoices,
  startDonors,
  toggleDonorField,
  writeDonorField,
} from '../../../../utils/materials/materialDonors';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import {
  groupStartingFields,
  OTHER_TYPE,
  UNSORTED_GROUP,
  applyMaterialType,
  copyMaterialField,
  materialColumns,
  materialFromGuess,
  writeMaterialField,
} from '../../../../utils/materials/materialItems';
import { listedMaterials } from '../../../../utils/materials/materialLookup';
import {
  LOT_FIELD,
  fillFromLotMemory,
  rememberLotValue,
} from '../../../../utils/materials/materialLots';
import {
  knownDonors,
  materialKnowledge,
  startingDonorFieldsOf,
} from '../../../../utils/materials/materialMemory';
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
import { plateNameOffers } from '../../../../utils/materials/plateNameOffers';
import { materialWellCounts } from '../../../../utils/plateMap/plateMapNames';
import {
  acceptStepReadings,
  readStepReadings,
  type MaterialReading,
} from '../../../../utils/steps/stepReadings';
import { materialsById } from '../../../../utils/values/valueEdits';

import { useMaterialAdding } from './useMaterialAdding';
import { useMaterialCellEditing, type MaterialCell } from './useMaterialCellEditing';
import { useMaterialRemoval } from './useMaterialRemoval';
import { WorkbenchMaterialAddBar, type NewGroupTarget } from './WorkbenchMaterialAddBar';
import { type DonorTableActions } from './WorkbenchMaterialDonorTable';
import { WorkbenchMaterialGroupDialog } from './WorkbenchMaterialGroupDialog';
import { type MaterialSectionActions } from './WorkbenchMaterialHeaderRow';
import { WorkbenchMaterialPlateNamesSection } from './WorkbenchMaterialPlateNamesSection';
import { WorkbenchMaterialReadingsSection } from './WorkbenchMaterialReadingsSection';
import { WorkbenchMaterialSection } from './WorkbenchMaterialSection';
import { WorkbenchMaterialSetAsideSection } from './WorkbenchMaterialSetAsideSection';
import { WorkbenchMaterialTable } from './WorkbenchMaterialTable';

import type { MaterialTypeSelection } from './materialSelectOptions';
import type { MaterialRowActions } from './WorkbenchMaterialRow';
import type {
  MaterialItem,
  ExperimentDonor,
  MaterialsCard,
  Protocol,
} from '@odysseus/shared-schemas';

interface WorkbenchMaterialsPanelProps {
  card: MaterialsCard;
}

type GroupDialogTarget = NewGroupTarget | { place: 'item'; itemId: string };

interface FieldMenuState {
  group: string;
  query: string;
}

const LEARN_DELAY_MS = 250;
const FIXED_CELLS = ['name', 'type'];

const NAME_CELL = 'name';

export function WorkbenchMaterialsPanel({ card }: WorkbenchMaterialsPanelProps) {
  const materials = useWorkbenchStore(state => state.protocol.materials);
  const plateMaps = useWorkbenchStore(state => state.protocol.plateMaps);
  const flowCytometryPanels = useWorkbenchStore(state => state.protocol.flowCytometryPanels);
  const materialsOnly = useMemo(() => ({ materials }), [materials]);
  const takenNameIdList = useWorkbenchData(state => [...state.board.takenNameIds]);
  const takenNameIds = useMemo(() => new Set(takenNameIdList), [takenNameIdList]);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const updateCard = useUpdateCard(card);
  const memory = useMaterialMemoryStore(state => state.memory);
  const catalog = useFluorCatalog();
  const rememberKind = useMaterialMemoryStore(state => state.rememberKind);
  const learnFromMaterials = useMaterialMemoryStore(state => state.learnFromMaterials);
  const toggleStartingField = useMaterialMemoryStore(state => state.toggleStartingField);
  const [fresh, setFresh] = useState({ ids: new Set<string>(), stamp: 0 });
  const [fieldMenu, setFieldMenu] = useState<FieldMenuState>();
  const [groupDialogTarget, setGroupDialogTarget] = useState<GroupDialogTarget>();
  const [openedDonorsId, setOpenedDonorsId] = useState<string>();

  const markFresh = useCallback(
    (ids: readonly string[]) =>
      setFresh(current => ({ ids: new Set(ids), stamp: current.stamp + 1 })),
    []
  );
  const fileFluors = useWorkbenchStore(state => state.protocol.fluors);
  const known = useMemo(
    () => materialKnowledge(memory, { materials, fluors: fileFluors }),
    [memory, materials, fileFluors]
  );
  const adding = useMaterialAdding(known, markFresh);
  const removal = useMaterialRemoval(id => markFresh([id]));
  const { removed } = removal;

  const sections = useMemo(
    () =>
      materialGroupsOf(materials.customGroups)
        .map(group => {
          const items = materials.items.filter(
            item => item.group === group.key && !item.isSetAside
          );
          return {
            group,
            items,
            columns: materialColumns(items),
            conflicts: group.key === ANTIBODY_GROUP ? conjugateConflicts(items) : [],
            isFolded: card.foldedGroups.includes(group.key),
            removed:
              removed && !removed.isFromSetAside && removed.item.group === group.key
                ? removed
                : undefined,
          };
        })
        .filter(section => section.items.length || section.removed)
        .sort(
          (x, y) => Number(y.group.key === UNSORTED_GROUP) - Number(x.group.key === UNSORTED_GROUP)
        ),
    [materials, card.foldedGroups, removed]
  );
  const setAsideItems = materials.items.filter(item => item.isSetAside);
  const itemIds = useMemo(() => materials.items.map(item => item.id), [materials.items]);
  const usageEntries = useWorkbenchData(state => [
    ...nameUsage(state.protocol, state.board, itemIds),
  ]);
  const usage = useMemo(() => new Map(usageEntries), [usageEntries]);
  const diluentUseList = useWorkbenchData(state => diluentUses(state.protocol, state.board));
  const diluentUseById = useMemo(
    () => new Map(diluentUseList.map(use => [use.materialId, use])),
    [diluentUseList]
  );
  const readings = useWorkbenchData(
    state => readStepReadings(state.protocol, state.board).materials
  );
  const allMaterials = useMemo(() => materialsById(materialsOnly), [materialsOnly]);
  const recipeUsers = useMemo(() => recipesUsing([...allMaterials.values()]), [allMaterials]);
  const plateWells = useMemo(() => {
    const counts = materialWellCounts(plateMaps, [...allMaterials.values()]);
    return new Map([...counts].map(([material, count]) => [material.id, count]));
  }, [plateMaps, allMaterials]);
  const panelDetectors = useMemo(
    () => panelDetectorLabels({ flowCytometryPanels }),
    [flowCytometryPanels]
  );
  const plateOffers = useWorkbenchData(state => plateNameOffers(state.protocol));
  const donorTargets = useMemo(() => donorTargetsOf(materialsOnly), [materialsOnly]);
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
        const item = draft.materials.items.find(candidate => candidate.id === itemId);
        if (item) recipe(item, draft);
      }),
    [updateProtocol]
  );

  const finishCell = useCallback(
    (cell: MaterialCell) => {
      if (cell.key === LOT_FIELD) {
        updateItem(cell.itemId, (item, draft) => fillFromLotMemory(draft.lotMemory, item));
      } else if (cell.key === CONJUGATE_FIELD) {
        updateItem(cell.itemId, (item, draft) => {
          const typed = item.values[cell.key] ?? '';
          const { name, toKeep } = resolveFluor(catalog, Object.values(memory.fluors), typed);
          if (toKeep) keepFluorInFile(draft, toKeep);
          if (name !== typed) item.values[cell.key] = name;
        });
      } else if (cell.key === NAME_CELL) {
        updateItem(cell.itemId, item => {
          item.name = withGreekLetters(item.name);
        });
      } else {
        updateItem(cell.itemId, item => {
          const definition = materialFields(item).find(field => field.key === cell.key);
          const text = item.values[cell.key];
          if (definition?.kind === 'text' && text) item.values[cell.key] = withGreekLetters(text);
        });
      }
    },
    [updateItem, catalog, memory.fluors]
  );
  const editing = useMaterialCellEditing(cellOrder, finishCell);
  const isEditingCell = editing.cell !== undefined;

  useEffect(() => {
    if (isEditingCell) return;
    const timer = setTimeout(() => learnFromMaterials(materials.items), LEARN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [materials.items, isEditingCell, learnFromMaterials]);

  const setItemKind = (itemId: string, { group, type }: MaterialTypeSelection) => {
    const name = materials.items.find(item => item.id === itemId)?.name ?? '';
    updateItem(itemId, item => applyMaterialType(item, group, type, memory));
    rememberKind(name, group, type);
    editing.stop();
  };

  const rowActions = useStableActions<MaterialRowActions>({
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
        updateItem(item.id, draft => applyMaterialType(draft, source.group, source.type, memory));
        rememberKind(item.name, source.group, source.type);
      } else {
        updateItem(item.id, draft => copyMaterialField(draft, source, key));
      }
    },
    suggest: (itemId, key, typed) =>
      fieldSuggestions(useWorkbenchStore.getState().protocol, key, typed, itemId),
    setAside: item => {
      editing.stop();
      removal.setAside(item);
    },
    remove: item => {
      editing.stop();
      removal.remove(item);
    },
    addRecipeLine: (itemId, text) =>
      updateProtocol(draft =>
        addRecipeLine(draft, itemId, text, name =>
          materialFromGuess(guessMaterial(name, known), memory)
        )
      ),
    editRecipeEntry: (itemId, entryId, change) =>
      updateProtocol(draft => editRecipeEntry(draft, itemId, entryId, change)),
    removeRecipeEntry: (itemId, entryId) =>
      updateProtocol(draft => removeRecipeEntry(draft, itemId, entryId)),
    makeDonorOf: (itemId, targetId) =>
      updateProtocol(draft => {
        const target = listedMaterials(draft).find(candidate => candidate.id === targetId);
        if (!target) return;
        startDonors(target, startingDonorFieldsOf(memory, target.group), memory.donorFields);
        moveIntoDonors(draft, itemId, targetId);
      }),
    startDonors: itemId => {
      updateItem(itemId, item =>
        startDonors(item, startingDonorFieldsOf(memory, item.group), memory.donorFields)
      );
      setOpenedDonorsId(itemId);
    },
  });

  useEffect(() => {
    if (openedDonorsId) setOpenedDonorsId(undefined);
  }, [openedDonorsId]);

  const updateDonor = (
    itemId: string,
    donorId: string,
    change: (donor: ExperimentDonor, draft: Protocol) => void
  ) =>
    updateItem(itemId, (item, draft) => {
      const donor = item.donors?.rows.find(row => row.id === donorId);
      if (donor) change(donor, draft);
    });

  const donorActions = useStableActions<DonorTableActions>({
    renameList: (itemId, label) =>
      updateItem(itemId, item => {
        if (item.donors) item.donors.label = label || DONORS_LABEL;
      }),
    removeList: itemId =>
      updateItem(itemId, item => {
        delete item.donors;
      }),
    add: (itemId, names) =>
      updateItem(itemId, item =>
        addDonorsNamed(item, names, startingDonorFieldsOf(memory, item.group), memory.donorFields)
      ),
    recall: (itemId, remembered) =>
      updateItem(itemId, item => {
        if (item.donors) addDonor(item.donors, remembered.name, remembered);
      }),
    rename: (itemId, donorId, name) =>
      updateDonor(itemId, donorId, donor => {
        donor.name = name;
      }),
    finishRename: (itemId, donorId) =>
      updateDonor(itemId, donorId, donor => {
        donor.name = withGreekLetters(donor.name.trim());
      }),
    write: (itemId, donorId, key, value) =>
      updateItem(itemId, item => {
        const donor = item.donors?.rows.find(row => row.id === donorId);
        if (item.donors && donor) writeDonorField(item.donors, donor, key, value);
      }),
    remove: (itemId, donorId) =>
      updateItem(itemId, item => {
        if (item.donors) item.donors.rows = item.donors.rows.filter(row => row.id !== donorId);
      }),
    toggleField: (itemId, key) =>
      updateItem(itemId, item => {
        if (item.donors) toggleDonorField(item.donors, key, memory.donorFields);
      }),
    addCustomField: (itemId, label) =>
      updateItem(itemId, item => {
        if (item.donors) addCustomDonorField(item.donors, label);
      }),
    togglePin: (group, key) => toggleStartingField('startingDonorFields', group, key),
    known: (typed, rows) => knownDonors(memory, typed, rows),
    fieldChoices: donors => donorFieldChoices(donors, memory.donorFields),
    pinnedKeys: group => new Set(startingDonorFieldsOf(memory, group)),
  });
  const plateNames = useMemo(() => plateOffers.map(offer => offer.name), [plateOffers]);

  const updateGroupItems = (group: string, recipe: (items: MaterialItem[]) => void) =>
    updateProtocol(draft => recipe(draft.materials.items.filter(item => item.group === group)));

  const sectionActions = useStableActions<MaterialSectionActions>({
    hideColumn: (group, fieldKey) =>
      updateGroupItems(group, items => hideSectionField(items, fieldKey)),
    toggleFieldMenu: group =>
      setFieldMenu(current => (current?.group === group ? undefined : { group, query: '' })),
  });

  const toggleFold = (group: string) =>
    updateCard(draft => {
      draft.foldedGroups = draft.foldedGroups.includes(group)
        ? draft.foldedGroups.filter(folded => folded !== group)
        : [...draft.foldedGroups, group];
    });

  const acceptReadings = (accepted: readonly MaterialReading[]) =>
    updateProtocol(draft =>
      acceptStepReadings(draft, { materials: accepted }, name =>
        materialFromGuess(guessMaterial(name, known), memory)
      )
    );

  const createGroup = (label: string) => {
    const target = groupDialogTarget;
    setGroupDialogTarget(undefined);
    const trimmed = withGreekLetters(label.trim());
    if (!target || !trimmed) return;
    const sameLabel = (candidate: { label: string }) =>
      candidate.label.toLowerCase() === trimmed.toLowerCase();
    if (!materialGroupsOf(materials.customGroups).some(sameLabel)) {
      updateProtocol(draft => {
        draft.materials.customGroups.push(trimmed);
      });
    }
    const group = materialGroupsOf([...materials.customGroups, trimmed]).find(sameLabel);
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
        items={materials.items}
        customGroups={materials.customGroups}
        onNewGroup={setGroupDialogTarget}
      />
      <div className="space-y-7">
        {sections.length ? (
          sections.map(section => {
            const { key } = section.group;
            const isFieldMenuOpen = fieldMenu?.group === key;
            const query = isFieldMenuOpen ? fieldMenu.query : '';
            return (
              <WorkbenchMaterialSection
                key={key}
                title={section.group.label}
                count={section.items.length}
                isFolded={section.isFolded}
                onToggleFold={() => toggleFold(key)}
              >
                <WorkbenchMaterialTable
                  group={key}
                  items={section.items}
                  columns={section.columns}
                  conflicts={section.conflicts}
                  customGroups={materials.customGroups}
                  usage={usage}
                  recipeOf={item => recipeLines(item, allMaterials)}
                  recipeUsers={recipeUsers}
                  plateWells={plateWells}
                  diluentUses={diluentUseById}
                  panelDetectors={panelDetectors}
                  takenNameIds={takenNameIds}
                  fresh={fresh}
                  removed={section.removed}
                  editing={editing}
                  actions={rowActions}
                  donorTargets={donorTargets}
                  donorActions={donorActions}
                  plateNames={plateNames}
                  openedDonorsId={openedDonorsId}
                  fieldMenu={{
                    isOpen: isFieldMenuOpen,
                    choices: isFieldMenuOpen
                      ? fieldChoices(
                          section.items,
                          new Set(section.columns.map(column => column.key)),
                          memory
                        )
                      : [],
                    pinnedKeys: new Set(groupStartingFields(memory, key)),
                    query,
                    onQueryChange: next => setFieldMenu({ group: key, query: next }),
                    onToggle: fieldKey =>
                      updateGroupItems(key, items => toggleSectionField(items, fieldKey, memory)),
                    onTogglePin: fieldKey => toggleStartingField('startingFields', key, fieldKey),
                    onAddCustom: () => {
                      const label = withGreekLetters(query.trim());
                      if (!label) return;
                      updateGroupItems(key, items => addCustomSectionField(items, label));
                      setFieldMenu({ group: key, query: '' });
                    },
                    onClose: () => setFieldMenu(undefined),
                  }}
                  sectionActions={sectionActions}
                  onUndo={removal.undo}
                />
              </WorkbenchMaterialSection>
            );
          })
        ) : (
          <PanelEmptyState
            icon={FlaskConical}
            message="Add materials above"
            description="Type a name, or paste a list"
          />
        )}
        {readings.length > 0 && (
          <WorkbenchMaterialReadingsSection
            readings={readings}
            guessType={name => guessMaterial(name, known).type}
            onAccept={acceptReadings}
            onIgnore={reading =>
              updateProtocol(draft => {
                draft.ignoredSuggestions.push(reading.key);
              })
            }
          />
        )}
        {plateOffers.length > 0 && <WorkbenchMaterialPlateNamesSection offers={plateOffers} />}
        {(setAsideItems.length > 0 || removed?.isFromSetAside) && (
          <WorkbenchMaterialSetAsideSection
            items={setAsideItems}
            usage={usage}
            isOpen={card.isSetAsideOpen}
            removed={removed?.isFromSetAside ? removed : undefined}
            onToggleOpen={() =>
              updateCard(draft => {
                draft.isSetAsideOpen = !draft.isSetAsideOpen;
              })
            }
            onRestore={removal.restoreSetAside}
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
