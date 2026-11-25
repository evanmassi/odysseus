import {
  knownDonors,
  materialKnowledge,
  startingDonorFieldsOf,
} from '../utils/materials/materialMemory';

import savedLabMemory from './fixtures/labMemory.json';
import { useMaterialMemoryStore } from './materialMemoryStore';

const LAB_MEMORY_KEY = 'odysseus-workbench-lab-memory';

async function reloadWith(memory: unknown) {
  localStorage.setItem(LAB_MEMORY_KEY, JSON.stringify({ state: { memory }, version: 1 }));
  await useMaterialMemoryStore.persist.rehydrate();
  return useMaterialMemoryStore.getState().memory;
}

describe('lab memory saved in the browser', () => {
  afterEach(() => localStorage.removeItem(LAB_MEMORY_KEY));

  it('comes back exactly as it was saved', async () => {
    expect(await reloadWith(savedLabMemory)).toEqual(savedLabMemory);
  });

  it('still offers what it remembers in a new protocol', async () => {
    const memory = await reloadWith(savedLabMemory);
    const knowledge = materialKnowledge(memory, {
      materials: { items: [], customGroups: [] },
      fluors: [],
    });
    expect({
      donor: knownDonors(memory, 'D-01', []).map(donor => `${donor.name} of ${donor.material}`),
      donorFields: memory.donorFields.map(field => field.label),
      pinnedDonorColumns: startingDonorFieldsOf(memory, 'bio'),
      fluors: knowledge.fluors.map(fluor => fluor.name),
      type: knowledge.knownTypes.get('celllinea')?.type,
    }).toEqual({
      donor: ['Donor 1 of PBMC'],
      donorFields: ['Freeze note'],
      pinnedDonorColumns: ['donor-id', 'viability', 'live-cell-conc'],
      fluors: ['Qx Fluor 512'],
      type: 'Cell line',
    });
  });
});
