import {
  knownSources,
  materialKnowledge,
  startingSourceFieldsOf,
} from '../utils/materials/materialMemory';

import savedLabMemory from './fixtures/labMemory.saved.json';
import { useMaterialMemoryStore } from './materialMemoryStore';

const LAB_MEMORY_KEY = 'odysseus-workbench-lab-memory';

async function reloadWith(memory: unknown) {
  localStorage.setItem(LAB_MEMORY_KEY, JSON.stringify({ state: { memory }, version: 0 }));
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
    const knowledge = materialKnowledge(memory, { blocks: [], dyes: [] });
    expect({
      donor: knownSources(memory, 'D-01', []).map(donor => `${donor.name} of ${donor.material}`),
      donorFields: memory.sourceFields.map(field => field.label),
      pinnedDonorColumns: startingSourceFieldsOf(memory, 'bio'),
      fluors: knowledge.fluors.map(fluor => fluor.name),
      type: knowledge.kinds.get('celllinea')?.type,
    }).toEqual({
      donor: ['Donor 1 of PBMC'],
      donorFields: ['Freeze note'],
      pinnedDonorColumns: ['donor-id', 'viability', 'live-count'],
      fluors: ['Qx Fluor 512'],
      type: 'Cell line',
    });
  });
});
