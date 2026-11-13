import { useMemo } from 'react';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { dilutionFactor, newStainMaterial } from '../../../../utils/cytometer/cytometerPanel';
import { BUILT_IN_INSTRUMENTS } from '../../../../utils/cytometer/instrumentCatalog';
import { createId } from '../../../../utils/ids/createId';
import { materialFields } from '../../../../utils/materials/materialCatalog';
import { writeMaterialField } from '../../../../utils/materials/materialItems';
import { ensureMaterial } from '../../../../utils/materials/materialLookup';

import type { CytometerBlock, FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

type PanelRow = CytometerBlock['rows'][number];
type Mix = CytometerBlock['mixes'][number];

export interface CytometerActions {
  pickInstrument: (name: string) => void;
  addStain: (materialId: string, detectorId: string) => void;
  createStain: (text: string, detectorId: string) => void;
  changeRow: (rowId: string, change: Partial<Omit<PanelRow, 'id' | 'materialId'>>) => void;
  setDilution: (rowId: string, typed: string) => void;
  removeStain: (rowId: string) => void;
  writeMaterial: (materialId: string, key: string, value: string) => void;
  addMixes: (mixes: Mix[]) => void;
  renameMix: (mixId: string, name: string) => void;
  toggleMixStain: (mixId: string, rowId: string) => void;
  removeMix: (mixId: string) => void;
  addPlus: (mixId: string, materialId: string, stain: string) => void;
  setPlusStain: (mixId: string, plusId: string, stain: string) => void;
  removePlus: (mixId: string, plusId: string) => void;
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

export function useCytometerActions(block: CytometerBlock): CytometerActions {
  const updateBlock = useUpdateBlock(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);

  return useMemo(() => {
    const updateRow = (rowId: string, recipe: (row: PanelRow) => void) =>
      updateBlock(draft => {
        const row = draft.rows.find(candidate => candidate.id === rowId);
        if (row) recipe(row);
      });
    const updateMix = (mixId: string, recipe: (mix: Mix) => void) =>
      updateBlock(draft => {
        const mix = draft.mixes.find(candidate => candidate.id === mixId);
        if (mix) recipe(mix);
      });
    return {
      pickInstrument: name =>
        updateBlock(draft => {
          const picked = BUILT_IN_INSTRUMENTS.find(instrument => instrument.name === name);
          if (picked) draft.instrument = structuredClone(picked);
        }),
      addStain: (materialId, detectorId) =>
        updateBlock(draft => {
          draft.rows.push({ id: createId(), materialId, detectorId, stain: '', dilution: '' });
        }),
      createStain: (text, detectorId) =>
        updateProtocol(draft => {
          const created = newStainMaterial(text, memory, draft);
          const material = ensureMaterial(draft, created.name, () => created);
          const panel = draft.blocks.find(candidate => candidate.id === block.id);
          if (panel?.type !== 'cytometer') return;
          panel.rows.push({
            id: createId(),
            materialId: material.id,
            detectorId,
            stain: '',
            dilution: '',
          });
        }),
      changeRow: (rowId, change) => updateRow(rowId, row => Object.assign(row, change)),
      setDilution: (rowId, typed) =>
        updateRow(rowId, row => {
          row.dilution = dilutionFactor(typed);
        }),
      removeStain: rowId =>
        updateBlock(draft => {
          draft.rows = draft.rows.filter(row => row.id !== rowId);
          draft.mixes.forEach(mix => {
            mix.rowIds = mix.rowIds.filter(id => id !== rowId);
          });
        }),
      writeMaterial: (materialId, key, value) =>
        updateProtocol(draft => {
          const item = draft.blocks
            .flatMap(candidate => (candidate.type === 'materials' ? candidate.items : []))
            .find(candidate => candidate.id === materialId);
          if (item) writeMaterialField(item, fieldFor(item, key), value);
        }),
      addMixes: mixes =>
        updateBlock(draft => {
          draft.mixes.push(...mixes);
        }),
      renameMix: (mixId, name) =>
        updateMix(mixId, mix => {
          mix.name = name;
        }),
      toggleMixStain: (mixId, rowId) =>
        updateMix(mixId, mix => {
          mix.rowIds = mix.rowIds.includes(rowId)
            ? mix.rowIds.filter(id => id !== rowId)
            : [...mix.rowIds, rowId];
        }),
      removeMix: mixId =>
        updateBlock(draft => {
          draft.mixes = draft.mixes.filter(mix => mix.id !== mixId);
        }),
      addPlus: (mixId, materialId, stain) =>
        updateMix(mixId, mix => {
          mix.plus.push({ id: createId(), materialId, stain });
        }),
      setPlusStain: (mixId, plusId, stain) =>
        updateMix(mixId, mix => {
          const plus = mix.plus.find(candidate => candidate.id === plusId);
          if (plus) plus.stain = stain;
        }),
      removePlus: (mixId, plusId) =>
        updateMix(mixId, mix => {
          mix.plus = mix.plus.filter(candidate => candidate.id !== plusId);
        }),
    };
  }, [block.id, memory, updateBlock, updateProtocol]);
}
