import { produce } from 'immer';

import { createBlock } from '../blocks/createBlock';
import { blankProtocol } from '../protocolFile/blankProtocol';
import { heldNames, setWellsText } from '../vessels/wellEdits';

import { listedMaterials } from './materialLookup';
import {
  followWellEdit,
  materialFollowsPlateRename,
  plateFollowsMaterialRename,
  renamePlateValue,
  withLeadingName,
} from './renameFollowing';

import type { Protocol, VesselMapBlock } from '@odysseus/shared-schemas';

const STIM_NAME = 'STX (Stim X Description (receptor agonist))';
const P1_WELLS = ['p1:A1', 'p1:A2'];
const P2_WELLS = ['p2:A1', 'p2:A2'];

function twoPlateProtocol(materialName = STIM_NAME): Protocol {
  return produce(blankProtocol(), draft => {
    const materials = draft.blocks.find(block => block.type === 'materials');
    if (materials?.type === 'materials') {
      materials.items.push({
        id: 'stim',
        group: 'bio',
        type: 'Microbial strain',
        name: materialName,
        shownFields: [],
        values: {},
        units: {},
        customFields: [],
        fieldLabels: {},
        isDropped: false,
        recipe: [],
      });
    }
    const map = createBlock('plate', { page: draft.pages[0].id, x: 0, y: 0, w: 6, h: 6 });
    if (map.type !== 'plate') return;
    map.id = 'map';
    map.plates = [
      { id: 'p1', vessel: '384', name: 'P1 - Flat bottom' },
      { id: 'p2', vessel: '384', name: 'P2 - V-bottom' },
    ];
    map.lines = [{ id: 'line', name: '', role: 'band', values: [{ id: 'stx', text: 'STX' }] }];
    map.cells = Object.fromEntries(
      [...P1_WELLS, ...P2_WELLS].map(key => [key, { line: { valueId: 'stx' } }])
    );
    draft.blocks.push(map);
  });
}

const mapOf = (protocol: Protocol) =>
  protocol.blocks.find((block): block is VesselMapBlock => block.id === 'map')!;
const stimName = (protocol: Protocol) =>
  listedMaterials(protocol).find(item => item.id === 'stim')?.name;
const plateTexts = (protocol: Protocol) => mapOf(protocol).lines[0].values.map(value => value.text);
const renameStim = (draft: Protocol, name: string) => {
  const item = listedMaterials(draft).find(candidate => candidate.id === 'stim');
  if (item) item.name = name;
};
const typeIntoWells = (protocol: Protocol, keys: string[], text: string) =>
  produce(protocol, draft => setWellsText(mapOf(draft), keys, 'line', text));

describe('withLeadingName', () => {
  it('swaps the name and keeps the description', () => {
    expect(withLeadingName(STIM_NAME, 'SXT')).toBe(
      'SXT (Stim X Description (receptor agonist))'
    );
    expect(withLeadingName('STX', 'SXT')).toBe('SXT');
  });
});

describe('materialFollowsPlateRename', () => {
  it('renames the material that matched the old plate name, keeping its description', () => {
    const renamed = produce(twoPlateProtocol(), draft => {
      mapOf(draft).lines[0].values[0].text = 'SXT';
      materialFollowsPlateRename(draft, 'STX', 'SXT');
    });
    expect(stimName(renamed)).toBe('SXT (Stim X Description (receptor agonist))');
  });

  it('leaves the material while wells still carry the old name', () => {
    const renamed = produce(twoPlateProtocol(), draft =>
      materialFollowsPlateRename(draft, 'STX', 'SXT')
    );
    expect(stimName(renamed)).toBe(STIM_NAME);
  });
});

describe('plateFollowsMaterialRename', () => {
  it('renames the plate name on every plate and keeps its own description', () => {
    const renamed = produce(twoPlateProtocol(), draft => {
      mapOf(draft).lines[0].values[0].text = 'STX (1e6/mL)';
      renameStim(draft, 'SXT (Stim X Description)');
      plateFollowsMaterialRename(draft, STIM_NAME, 'SXT (Stim X Description)');
    });
    expect(plateTexts(renamed)).toEqual(['SXT (1e6/mL)']);
  });

  it('leaves the plate alone when only the description changed', () => {
    const renamed = produce(twoPlateProtocol(), draft => {
      renameStim(draft, 'STX (lot 2)');
      plateFollowsMaterialRename(draft, STIM_NAME, 'STX (lot 2)');
    });
    expect(plateTexts(renamed)).toEqual(['STX']);
  });

  it('waits while another material still has the old name', () => {
    const renamed = produce(twoPlateProtocol(), draft =>
      plateFollowsMaterialRename(draft, 'STX (another vial)', 'SXT')
    );
    expect(plateTexts(renamed)).toEqual(['STX']);
  });

  it('merges into a plate name that already has the new name', () => {
    let protocol = typeIntoWells(twoPlateProtocol(), P2_WELLS, 'SXT');
    expect(plateTexts(protocol)).toEqual(['STX', 'SXT']);
    protocol = produce(protocol, draft => {
      renameStim(draft, 'SXT');
      plateFollowsMaterialRename(draft, STIM_NAME, 'SXT');
    });
    expect(plateTexts(protocol)).toEqual(['SXT']);
  });
});

describe('renamePlateValue', () => {
  it('renames the name in the legend and the material with it', () => {
    const renamed = produce(twoPlateProtocol(), draft =>
      renamePlateValue(draft, 'map', 'stx', 'SXT')
    );
    expect(plateTexts(renamed)).toEqual(['SXT']);
    expect(stimName(renamed)).toBe('SXT (Stim X Description (receptor agonist))');
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
    const followed = produce(edited, draft => followWellEdit(draft, 'map', started, wells));
    expect(stimName(followed)).toBe('SXT (Stim X Description (receptor agonist))');
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
