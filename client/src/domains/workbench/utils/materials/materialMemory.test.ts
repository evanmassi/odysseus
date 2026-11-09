import { blankProtocol } from '../protocolFile/blankProtocol';

import { materialFromGuess } from './materialItems';
import { fillFromLotMemory, rememberLotValue } from './materialLots';
import {
  EMPTY_LAB_MEMORY,
  learnFromMaterials,
  learnedFields,
  rememberKind,
  rememberedKinds,
  toggleStartingField,
} from './materialMemory';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const material = (name: string, group = 'chem', type = 'Chemical'): MaterialItem =>
  materialFromGuess({ group, type, name, values: {}, why: '', source: 'list' }, EMPTY_LAB_MEMORY);

const shelf = {
  key: 'custom-shelf',
  label: 'Shelf',
  kind: 'text' as const,
  scope: 'protocol' as const,
  unit: '',
  options: [],
};

describe('learnFromMaterials', () => {
  it('remembers named, kept, sorted materials by loose name', () => {
    const kept = material('NaCl');
    kept.values['vendor'] = 'Sigma';
    const dropped = { ...material('KCl'), isDropped: true };
    const unsorted = material('Mystery', 'unsorted', 'Other');
    const unnamed = material('  ');
    const memory = learnFromMaterials(EMPTY_LAB_MEMORY, [kept, dropped, unsorted, unnamed]);
    expect(Object.keys(memory.materials)).toEqual(['nacl']);
    expect(memory.materials['nacl']).toMatchObject({ group: 'chem', values: { vendor: 'Sigma' } });
  });

  it('learns custom fields for the kind only while they are shown', () => {
    const shown = { ...material('NaCl'), customFields: [shelf], shownFields: ['custom-shelf'] };
    const hidden = { ...material('KCl'), customFields: [{ ...shelf, key: 'custom-bin' }] };
    const memory = learnFromMaterials(EMPTY_LAB_MEMORY, [shown, hidden, shown]);
    expect(learnedFields(memory, shown).map(field => field.key)).toEqual(['custom-shelf']);
  });

  it('does not touch the memory it was given', () => {
    learnFromMaterials(EMPTY_LAB_MEMORY, [material('NaCl')]);
    expect(EMPTY_LAB_MEMORY.materials).toEqual({});
  });
});

describe('rememberedKinds', () => {
  const protocolWith = (items: MaterialItem[]): Protocol => {
    const protocol = blankProtocol();
    const block = protocol.blocks.find(candidate => candidate.type === 'materials');
    if (block?.type === 'materials') block.items = items;
    return protocol;
  };

  it('prefers what you set by hand over this protocol over earlier protocols', () => {
    let memory = learnFromMaterials(EMPTY_LAB_MEMORY, [material('PBS', 'chem', 'Solvent')]);
    const protocol = protocolWith([material('PBS', 'media', 'Buffer')]);
    expect(rememberedKinds(memory, protocol).get('pbs')).toMatchObject({
      type: 'Buffer',
      why: 'already in this protocol',
    });
    memory = rememberKind(memory, 'PBS', 'media', 'Stock solution');
    expect(rememberedKinds(memory, protocol).get('pbs')).toEqual({
      group: 'media',
      type: 'Stock solution',
    });
  });

  it('ignores blank names when remembering a kind', () => {
    expect(rememberKind(EMPTY_LAB_MEMORY, ' ', 'chem', 'Chemical')).toBe(EMPTY_LAB_MEMORY);
  });
});

describe('lot memory', () => {
  it('remembers lot-scoped values per lot and fills only blanks when the lot comes back', () => {
    const lotMemory: Protocol['lotMemory'] = {};
    const item = material('CD4', 'ab', 'Antibody');
    rememberLotValue(lotMemory, item, 'stock-concentration', '200');
    expect(lotMemory).toEqual({});
    item.values['lot'] = 'B123';
    rememberLotValue(lotMemory, item, 'stock-concentration', '200');
    expect(lotMemory[item.id]).toEqual({ B123: { 'stock-concentration': '200' } });

    const reopened: MaterialItem = { ...item, values: { lot: 'B123' }, shownFields: [] };
    expect(fillFromLotMemory(lotMemory, reopened)).toBe(true);
    expect(reopened.values['stock-concentration']).toBe('200');
    expect(reopened.shownFields).toEqual(['stock-concentration']);
    expect(fillFromLotMemory(lotMemory, reopened)).toBe(false);
  });
});

describe('toggleStartingField', () => {
  it('unpins from the current list, then pins back at the end', () => {
    const current = ['vendor', 'catalog', 'lot', 'isotype'];
    const unpinned = toggleStartingField(EMPTY_LAB_MEMORY, 'ab', 'lot', current);
    expect(unpinned.startingFields).toEqual({ ab: ['vendor', 'catalog', 'isotype'] });
    const repinned = toggleStartingField(unpinned, 'ab', 'lot', unpinned.startingFields['ab']);
    expect(repinned.startingFields['ab']).toEqual(['vendor', 'catalog', 'isotype', 'lot']);
  });
});
