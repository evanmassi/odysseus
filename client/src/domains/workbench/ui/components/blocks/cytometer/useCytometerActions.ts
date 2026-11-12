import { useMemo } from 'react';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { dilutionFactor } from '../../../../utils/cytometer/cytometerPanel';
import { BUILT_IN_INSTRUMENTS } from '../../../../utils/cytometer/instrumentCatalog';
import { createId } from '../../../../utils/ids/createId';
import { materialFields } from '../../../../utils/materials/materialCatalog';
import { writeMaterialField } from '../../../../utils/materials/materialItems';

import type { CytometerBlock, FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

type PanelRow = CytometerBlock['rows'][number];

export interface CytometerActions {
  pickInstrument: (name: string) => void;
  addStain: (materialId: string, detectorId: string) => void;
  changeRow: (rowId: string, change: Partial<Omit<PanelRow, 'id' | 'materialId'>>) => void;
  setDilution: (rowId: string, typed: string) => void;
  removeStain: (rowId: string) => void;
  writeMaterial: (materialId: string, key: string, value: string) => void;
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

  return useMemo(() => {
    const updateRow = (rowId: string, recipe: (row: PanelRow) => void) =>
      updateBlock(draft => {
        const row = draft.rows.find(candidate => candidate.id === rowId);
        if (row) recipe(row);
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
      changeRow: (rowId, change) => updateRow(rowId, row => Object.assign(row, change)),
      setDilution: (rowId, typed) =>
        updateRow(rowId, row => {
          row.dilution = dilutionFactor(typed);
        }),
      removeStain: rowId =>
        updateBlock(draft => {
          draft.rows = draft.rows.filter(row => row.id !== rowId);
        }),
      writeMaterial: (materialId, key, value) =>
        updateProtocol(draft => {
          const item = draft.blocks
            .flatMap(candidate => (candidate.type === 'materials' ? candidate.items : []))
            .find(candidate => candidate.id === materialId);
          if (item) writeMaterialField(item, fieldFor(item, key), value);
        }),
    };
  }, [updateBlock, updateProtocol]);
}
