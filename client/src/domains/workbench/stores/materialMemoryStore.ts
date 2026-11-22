import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { groupStartingFields } from '../utils/materials/materialItems';
import {
  EMPTY_LAB_MEMORY,
  learnFromMaterials,
  rememberFluors,
  rememberKind,
  startingSourceFieldsOf,
  toggleStartingField,
  type LabMemory,
  type PinnedFields,
} from '../utils/materials/materialMemory';

import type { MaterialItem, ProtocolFluor } from '@odysseus/shared-schemas';

const LAB_MEMORY_KEY = 'odysseus-workbench-lab-memory';

interface MaterialMemoryState {
  memory: LabMemory;
  rememberKind: (name: string, group: string, type: string) => void;
  learnFromMaterials: (items: readonly MaterialItem[]) => void;
  rememberFluors: (fluors: readonly ProtocolFluor[]) => void;
  toggleStartingField: (pins: PinnedFields, group: string, key: string) => void;
}

export const useMaterialMemoryStore = create<MaterialMemoryState>()(
  persist(
    set => ({
      memory: EMPTY_LAB_MEMORY,
      rememberKind: (name, group, type) =>
        set(state => ({ memory: rememberKind(state.memory, name, group, type) })),
      learnFromMaterials: items =>
        set(state => {
          const memory = learnFromMaterials(state.memory, items);
          return memory === state.memory ? state : { memory };
        }),
      rememberFluors: fluors =>
        set(state => {
          const memory = rememberFluors(state.memory, fluors);
          return memory === state.memory ? state : { memory };
        }),
      toggleStartingField: (pins, group, key) =>
        set(state => ({
          memory: toggleStartingField(
            state.memory,
            pins,
            group,
            key,
            pins === 'startingFields'
              ? groupStartingFields(state.memory, group)
              : startingSourceFieldsOf(state.memory, group)
          ),
        })),
    }),
    {
      name: LAB_MEMORY_KEY,
      partialize: state => ({ memory: state.memory }),
      // PITFALL: memory saved before a field was added to LabMemory lacks it; fill from the empty shape.
      merge: (persisted, current) => ({
        ...current,
        memory: {
          ...EMPTY_LAB_MEMORY,
          ...(persisted as Partial<MaterialMemoryState> | undefined)?.memory,
        },
      }),
    }
  )
);
