import {
  knownDonors,
  materialKnowledge,
  startingDonorFieldsOf,
} from '../utils/materials/materialMemory';

import savedLabMemory from './fixtures/labMemory.saved.json';
import labMemoryV1 from './fixtures/labMemory.v1.json';
import { useMaterialMemoryStore } from './materialMemoryStore';

const LAB_MEMORY_KEY = 'odysseus-workbench-lab-memory';

async function reloadWith(memory: unknown, version = 0) {
  localStorage.setItem(LAB_MEMORY_KEY, JSON.stringify({ state: { memory }, version }));
  await useMaterialMemoryStore.persist.rehydrate();
  return useMaterialMemoryStore.getState().memory;
}

describe('lab memory saved in the browser', () => {
  afterEach(() => localStorage.removeItem(LAB_MEMORY_KEY));

  it('comes back in today’s words with everything it remembered', async () => {
    expect(await reloadWith(savedLabMemory)).toEqual(labMemoryV1);
  });

  it('comes back exactly as it was saved once in today’s words', async () => {
    expect(await reloadWith(labMemoryV1, 1)).toEqual(labMemoryV1);
  });

  it.each([
    ['saved before today’s words', savedLabMemory, 0],
    ['saved in today’s words', labMemoryV1, 1],
  ])('still offers what it remembers in a new protocol, %s', async (_label, saved, version) => {
    const memory = await reloadWith(saved, version);
    const knowledge = materialKnowledge(memory, { cards: [], fluors: [] });
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
