import { useMemo } from 'react';

import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { BUILT_IN_CYTOMETERS } from '../../../../utils/flowCytometry/cytometerCatalog';
import { newMarkerMaterial } from '../../../../utils/flowCytometry/flowCytometryPanel';
import { keepFluorsUsedBy } from '../../../../utils/fluors/fileFluors';
import { createId } from '../../../../utils/ids/createId';
import { materialFields } from '../../../../utils/materials/materialCatalog';
import { writeMaterialField } from '../../../../utils/materials/materialItems';
import { ensureMaterial } from '../../../../utils/materials/materialLookup';
import { materialKnowledge } from '../../../../utils/materials/materialMemory';
import { unpaintStains } from '../../../../utils/plateMap/stainSide';

import type {
  FlowCytometryPanel,
  Stain,
  FieldDefinition,
  MaterialItem,
} from '@odysseus/shared-schemas';

type PanelRow = FlowCytometryPanel['markers'][number];

export interface FlowCytometryActions {
  pickCytometer: (name: string) => void;
  addMarker: (materialId: string, detectorId: string) => void;
  createMarker: (text: string, detectorId: string) => void;
  changeRow: (rowId: string, change: Partial<Omit<PanelRow, 'id' | 'materialId'>>) => void;
  removeMarker: (rowId: string) => void;
  writeMaterial: (materialId: string, key: string, value: string) => void;
  addStains: (stains: Stain[]) => void;
  renameStain: (stainId: string, name: string) => void;
  toggleStainMarker: (stainId: string, rowId: string) => void;
  removeStain: (stainId: string) => void;
  addPlus: (stainId: string, materialId: string, staining: string) => void;
  setPlusStaining: (stainId: string, plusId: string, staining: string) => void;
  removePlus: (stainId: string, plusId: string) => void;
}

const fieldFor = (item: MaterialItem, key: string): FieldDefinition =>
  materialFields(item).find(definition => definition.key === key) ?? {
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    kind: 'text',
    scope: 'protocol',
    unit: '',
    options: [],
  };

export function useFlowCytometryActions(panelId: string): FlowCytometryActions {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);

  return useMemo(() => {
    const updatePanel = (recipe: (panel: FlowCytometryPanel) => void) =>
      updateProtocol(draft => {
        const panel = draft.flowCytometryPanels.find(candidate => candidate.id === panelId);
        if (panel) recipe(panel);
      });
    const updateRow = (rowId: string, recipe: (row: PanelRow) => void) =>
      updatePanel(draft => {
        const row = draft.markers.find(candidate => candidate.id === rowId);
        if (row) recipe(row);
      });
    const updateStain = (stainId: string, recipe: (stain: Stain) => void) =>
      updatePanel(draft => {
        const stain = draft.stains.find(candidate => candidate.id === stainId);
        if (stain) recipe(stain);
      });
    return {
      pickCytometer: name =>
        updatePanel(draft => {
          const picked = BUILT_IN_CYTOMETERS.find(cytometer => cytometer.name === name);
          if (picked) draft.cytometer = structuredClone(picked);
        }),
      addMarker: (materialId, detectorId) =>
        updatePanel(draft => {
          draft.markers.push({
            id: createId(),
            materialId,
            detectorId,
            staining: '',
          });
        }),
      createMarker: (text, detectorId) =>
        updateProtocol(draft => {
          const known = materialKnowledge(memory, draft);
          const created = newMarkerMaterial(text, known, memory);
          const material = ensureMaterial(draft, created.name, () => created);
          keepFluorsUsedBy(draft, [material], known.fluors);
          const panel = draft.flowCytometryPanels.find(candidate => candidate.id === panelId);
          panel?.markers.push({
            id: createId(),
            materialId: material.id,
            detectorId,
            staining: '',
          });
        }),
      changeRow: (rowId, change) => updateRow(rowId, row => Object.assign(row, change)),
      removeMarker: rowId =>
        updatePanel(draft => {
          draft.markers = draft.markers.filter(row => row.id !== rowId);
          draft.stains.forEach(stain => {
            stain.markerIds = stain.markerIds.filter(id => id !== rowId);
          });
        }),
      writeMaterial: (materialId, key, value) =>
        updateProtocol(draft => {
          const item = draft.materials.items.find(candidate => candidate.id === materialId);
          if (item) writeMaterialField(item, fieldFor(item, key), value);
        }),
      addStains: stains =>
        updatePanel(draft => {
          draft.stains.push(...stains);
        }),
      renameStain: (stainId, name) =>
        updateStain(stainId, stain => {
          stain.name = name;
        }),
      toggleStainMarker: (stainId, rowId) =>
        updateStain(stainId, stain => {
          stain.markerIds = stain.markerIds.includes(rowId)
            ? stain.markerIds.filter(id => id !== rowId)
            : [...stain.markerIds, rowId];
        }),
      removeStain: stainId =>
        updateProtocol(draft => {
          const panel = draft.flowCytometryPanels.find(candidate => candidate.id === panelId);
          if (panel) panel.stains = panel.stains.filter(stain => stain.id !== stainId);
          unpaintStains(draft.plateMaps, new Set([stainId]));
        }),
      addPlus: (stainId, materialId, staining) =>
        updateStain(stainId, stain => {
          stain.plus.push({ id: createId(), materialId, staining: staining });
        }),
      setPlusStaining: (stainId, plusId, staining) =>
        updateStain(stainId, stain => {
          const plus = stain.plus.find(candidate => candidate.id === plusId);
          if (plus) plus.staining = staining;
        }),
      removePlus: (stainId, plusId) =>
        updateStain(stainId, stain => {
          stain.plus = stain.plus.filter(candidate => candidate.id !== plusId);
        }),
    };
  }, [panelId, memory, updateProtocol]);
}
