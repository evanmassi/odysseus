import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  EMPTY_LAB_MEMORY,
  learnFromMaterials,
  rememberKind,
  type LabMemory,
} from '../utils/materials/materialMemory';

import type { MaterialItem } from '@odysseus/shared-schemas';

const LAB_MEMORY_KEY = 'odysseus-workbench-lab-memory';

interface MaterialMemoryState {
  memory: LabMemory;
  rememberKind: (name: string, group: string, type: string) => void;
  learnFromMaterials: (items: readonly MaterialItem[]) => void;
}

export const useMaterialMemoryStore = create<MaterialMemoryState>()(
  persist(
    set => ({
      memory: EMPTY_LAB_MEMORY,
      rememberKind: (name, group, type) =>
        set(state => ({ memory: rememberKind(state.memory, name, group, type) })),
      learnFromMaterials: items =>
        set(state => ({ memory: learnFromMaterials(state.memory, items) })),
    }),
    { name: LAB_MEMORY_KEY, partialize: state => ({ memory: state.memory }) }
  )
);
