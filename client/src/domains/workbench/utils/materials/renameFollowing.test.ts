import { produce } from 'immer';

import { newPlateMap } from '../plateMap/plateMapEdits';
import { heldNames, setWellsText } from '../plateMap/wellEdits';
import { blankProtocol } from '../protocolFile/blankProtocol';

import { SHORT_NAME_FIELD } from './materialCatalog';
import { startDonors } from './materialDonors';
import { listedMaterials } from './materialLookup';
import {
  followWellEdit,
  linkPlateNames,
  nameChangeOf,
  renamePlateValue,
  withLeadingName,
} from './renameFollowing';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const STIM_NAME = 'STX (Stim X Description (receptor agonist))';
const P1_WELLS = ['p1:A1', 'p1:A2'];
const P2_WELLS = ['p2:A1', 'p2:A2'];

const materialNamed = (id: string, name: string): MaterialItem => ({
  id,
  group: 'bio',
  type: 'Microbial strain',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isSetAside: false,
  recipe: [],
});

const settled = (protocol: Protocol) => produce(protocol, linkPlateNames);

function plateProtocol(materials: MaterialItem[], text: string): Protocol {
  return settled(
    produce(blankProtocol(), draft => {
      draft.materials.items.push(...materials);
      draft.plateMaps.push({
        ...newPlateMap(),
        id: 'map',
        plates: [
          { id: 'p1', labware: '384', name: 'P1 - Flat bottom' },
          { id: 'p2', labware: '384', name: 'P2 - V-bottom' },
        ],
        lines: [{ id: 'line', name: '', role: 'band', values: [{ id: 'stx', text }] }],
        samples: Object.fromEntries(
          [...P1_WELLS, ...P2_WELLS].map(key => [key, { line: { valueId: 'stx' } }])
        ),
      });
    })
  );
}

const twoPlateProtocol = (materialName = STIM_NAME, text = 'STX') =>
  plateProtocol([materialNamed('stim', materialName)], text);

const mapOf = (protocol: Protocol, id = 'map') =>
  protocol.plateMaps.find(plateMap => plateMap.id === id)!;
const stimName = (protocol: Protocol) =>
  listedMaterials(protocol).find(item => item.id === 'stim')?.name;
const plateTexts = (protocol: Protocol, id = 'map') =>
  mapOf(protocol, id).lines[0].values.map(value => value.text);
const renamed = (protocol: Protocol, id: string, name: string) =>
  settled(
    produce(protocol, draft => {
      const item = draft.materials.items.find(candidate => candidate.id === id);
      if (item) item.name = name;
    })
  );
const withDonor = (protocol: Protocol, name: string) =>
  settled(
    produce(protocol, draft => {
      const item = listedMaterials(draft).find(candidate => candidate.id === 'stim');
      if (!item) return;
      startDonors(item, [], []);
      item.donors?.rows.push({ id: name, name, values: {}, units: {} });
    })
  );
const typeIntoWells = (protocol: Protocol, keys: string[], text: string) =>
  settled(produce(protocol, draft => setWellsText(mapOf(draft), keys, 'line', text)));

describe('withLeadingName', () => {
  it('swaps the name and keeps the description', () => {
    expect(withLeadingName(STIM_NAME, 'SXT')).toBe('SXT (Stim X Description (receptor agonist))');
    expect(withLeadingName('STX', 'SXT')).toBe('SXT');
  });
});

describe('linkPlateNames', () => {
  it('links a painted name to the material it names', () => {
    expect(mapOf(twoPlateProtocol()).lines[0].values[0].links).toEqual([
      { materialId: 'stim', name: STIM_NAME },
    ]);
  });

  it('carries a material rename onto the plate and keeps the well’s own notes', () => {
    const protocol = renamed(
      twoPlateProtocol(STIM_NAME, 'STX (1e6/mL)'),
      'stim',
      'SXT (Stim X Description)'
    );
    expect(plateTexts(protocol)).toEqual(['SXT (1e6/mL)']);
  });

  it('leaves the plate alone when only the description changed', () => {
    expect(plateTexts(renamed(twoPlateProtocol(), 'stim', 'STX (lot 2)'))).toEqual(['STX']);
  });

  it('gives wells holding the whole old name the whole new name, even when only notes changed', () => {
    expect(plateTexts(renamed(twoPlateProtocol(STIM_NAME, STIM_NAME), 'stim', 'STX'))).toEqual([
      'STX',
    ]);
  });

  it('renames a plate line named for the material', () => {
    const protocol = settled(
      produce(twoPlateProtocol('STX'), draft => {
        mapOf(draft).lines[0].name = 'STX';
      })
    );
    expect(mapOf(renamed(protocol, 'stim', 'SXT')).lines[0].name).toBe('SXT');
  });

  it('follows each material a name holds', () => {
    const protocol = plateProtocol(
      [materialNamed('raji', 'Raji-Luc'), materialNamed('t', 'T cells')],
      'Raji-Luc + T cells'
    );
    const after = renamed(protocol, 'raji', 'Raji');
    expect(plateTexts(after)).toEqual(['Raji + T cells']);
    expect(mapOf(after).lines[0].values[0].links?.map(link => link.materialId)).toEqual([
      'raji',
      't',
    ]);
  });

  it('keeps the last name when its material is removed and links again when one with that name returns', () => {
    const removed = settled(
      produce(twoPlateProtocol('STX'), draft => {
        draft.materials.items = [];
      })
    );
    expect(plateTexts(removed)).toEqual(['STX']);
    expect(mapOf(removed).lines[0].values[0].links).toBeUndefined();
    const returned = settled(
      produce(removed, draft => {
        draft.materials.items.push(materialNamed('again', 'STX'));
      })
    );
    expect(mapOf(returned).lines[0].values[0].links).toEqual([
      { materialId: 'again', name: 'STX' },
    ]);
  });

  it('carries a short name change onto the plate, and the full name when it is cleared', () => {
    const withShortName = (shortName: string) => (draft: Protocol) => {
      const item = draft.materials.items[0];
      item.shownFields = [SHORT_NAME_FIELD];
      item.values[SHORT_NAME_FIELD] = shortName;
    };
    const protocol = settled(
      produce(
        twoPlateProtocol('Heat Killed Candida albicans', 'HKCA (low dose)'),
        withShortName('HKCA')
      )
    );
    expect(mapOf(protocol).lines[0].values[0].links).toEqual([
      { materialId: 'stim', name: 'Heat Killed Candida albicans', shortName: 'HKCA' },
    ]);
    const shortened = settled(produce(protocol, withShortName('HK')));
    expect(plateTexts(shortened)).toEqual(['HK (low dose)']);
    const cleared = settled(produce(shortened, withShortName('')));
    expect(plateTexts(cleared)).toEqual(['Heat Killed Candida albicans (low dose)']);
  });

  it('carries a donor rename onto the plate', () => {
    const protocol = renamePlateValueTo(withDonor(twoPlateProtocol(), 'D3128'), 'D3128');
    const after = settled(
      produce(protocol, draft => {
        const donor = listedMaterials(draft)[0].donors?.rows[0];
        if (donor) donor.name = 'D3129';
      })
    );
    expect(plateTexts(after)).toEqual(['D3129']);
  });

  it('merges into a plate name that already has the new name', () => {
    const protocol = typeIntoWells(twoPlateProtocol(), P2_WELLS, 'SXT');
    expect(plateTexts(protocol)).toEqual(['STX', 'SXT']);
    expect(plateTexts(renamed(protocol, 'stim', 'SXT'))).toEqual(['SXT']);
  });
});

function renamePlateValueTo(protocol: Protocol, text: string): Protocol {
  return settled(produce(protocol, draft => renamePlateValue(draft, 'map', 'stx', text)));
}

describe('renamePlateValue', () => {
  it('renames the name in the legend and the material with it', () => {
    const protocol = renamePlateValueTo(twoPlateProtocol(), 'SXT');
    expect(plateTexts(protocol)).toEqual(['SXT']);
    expect(stimName(protocol)).toBe('SXT (Stim X Description (receptor agonist))');
  });

  it('renames the material on every plate map that holds it', () => {
    const start = twoPlateProtocol();
    const protocol = produce(start, draft => {
      draft.plateMaps.push({ ...structuredClone(mapOf(start)), id: 'other' });
    });
    expect(plateTexts(renamePlateValueTo(protocol, 'SXT'), 'other')).toEqual(['SXT']);
  });

  it('switches to a donor when the new name is one, leaving the material', () => {
    const protocol = renamePlateValueTo(withDonor(twoPlateProtocol(), 'D3128'), 'D3128');
    expect(plateTexts(protocol)).toEqual(['D3128']);
    expect(stimName(protocol)).toBe(STIM_NAME);
    expect(mapOf(protocol).lines[0].values[0].links).toEqual([
      { materialId: 'stim', donorId: 'D3128', name: 'D3128' },
    ]);
  });
});

describe('renaming on the plate', () => {
  const USTEKINUMAB = 'Ustekinumab (anti-IL-12/23p40)';
  const ustekinumab = () => twoPlateProtocol(USTEKINUMAB, USTEKINUMAB);

  it('gives the material exactly the new name when the plate held its whole name', () => {
    const protocol = renamePlateValueTo(ustekinumab(), 'Ustekinumab');
    expect(stimName(protocol)).toBe('Ustekinumab');
    expect(plateTexts(protocol)).toEqual(['Ustekinumab']);
  });

  it('renames the material from the well editor when every well takes the new name', () => {
    const before = ustekinumab();
    const wells = [...P1_WELLS, ...P2_WELLS];
    const started = heldNames(mapOf(before), wells);
    const edited = typeIntoWells(before, wells, 'Ustekinumab');
    const followed = settled(
      produce(edited, draft => followWellEdit(draft, 'map', started, wells))
    );
    expect(stimName(followed)).toBe('Ustekinumab');
  });

  it('changes the short name when the plate held the short name', () => {
    const protocol = settled(
      produce(twoPlateProtocol('Heat Killed Candida albicans', 'HKCA'), draft => {
        draft.materials.items[0].shownFields = [SHORT_NAME_FIELD];
        draft.materials.items[0].values[SHORT_NAME_FIELD] = 'HKCA';
      })
    );
    const renamedShort = renamePlateValueTo(protocol, 'HK');
    expect(stimName(renamedShort)).toBe('Heat Killed Candida albicans');
    expect(renamedShort.materials.items[0].values[SHORT_NAME_FIELD]).toBe('HK');
    expect(plateTexts(renamedShort)).toEqual(['HK']);
  });

  it('tells a rename from the well’s own notes', () => {
    const [held] = mapOf(ustekinumab()).lines[0].values;
    expect(nameChangeOf(held, 'Ustekinumab')).toBe('whole');
    expect(nameChangeOf(held, `${USTEKINUMAB} (low dose)`)).toBeUndefined();
    const [bare] = mapOf(twoPlateProtocol()).lines[0].values;
    expect(nameChangeOf(bare, 'STX (1e6/mL)')).toBeUndefined();
    expect(nameChangeOf(bare, 'SXT')).toBe('leading');
    const [whole] = mapOf(twoPlateProtocol('STX')).lines[0].values;
    expect(nameChangeOf(whole, 'STXY')).toBe('whole');
  });
});

describe('followWellEdit', () => {
  it('keeps the material when only some wells take the new name', () => {
    const before = twoPlateProtocol();
    const started = heldNames(mapOf(before), P2_WELLS);
    const edited = typeIntoWells(before, P2_WELLS, 'SXT');
    const followed = produce(edited, draft => followWellEdit(draft, 'map', started, P2_WELLS));
    expect(plateTexts(followed)).toEqual(['STX', 'SXT']);
    expect(stimName(followed)).toBe(STIM_NAME);
  });

  it('renames the material when every well with the name was renamed, even through a cleared field', () => {
    const before = twoPlateProtocol();
    const wells = [...P1_WELLS, ...P2_WELLS];
    const started = heldNames(mapOf(before), wells);
    let edited = before;
    for (const text of ['', 'S', 'SX', 'SXT']) edited = typeIntoWells(edited, wells, text);
    const followed = settled(
      produce(edited, draft => followWellEdit(draft, 'map', started, wells))
    );
    expect(stimName(followed)).toBe('SXT (Stim X Description (receptor agonist))');
    expect(mapOf(followed).lines[0].values.find(value => value.text === 'SXT')?.links).toEqual([
      { materialId: 'stim', name: 'SXT (Stim X Description (receptor agonist))' },
    ]);
  });

  it('never renames a material passed on the way while typing a new name', () => {
    const before = twoPlateProtocol('IL-2');
    const started = heldNames(mapOf(before), ['p1:B1']);
    let edited = before;
    for (const text of ['IL', 'IL-2', 'IL-21']) edited = typeIntoWells(edited, ['p1:B1'], text);
    const followed = produce(edited, draft => followWellEdit(draft, 'map', started, ['p1:B1']));
    expect(stimName(followed)).toBe('IL-2');
  });
});
