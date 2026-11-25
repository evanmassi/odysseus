import { produce } from 'immer';

import { showPlateMap } from '../utils/cards/createCard';
import { referenceParts } from '../utils/formulas/nameReferences';
import { linkReferences } from '../utils/formulas/referenceLinks';
import { startDonors } from '../utils/materials/materialDonors';
import { plateFollowsListRename } from '../utils/materials/renameFollowing';
import { newPlateMap } from '../utils/plateMap/plateMapEdits';
import { blankProtocol } from '../utils/protocolFile/blankProtocol';
import { moveValueToRow } from '../utils/values/valueEdits';

import { selectIsDirty, useWorkbenchStore } from './workbenchStore';

import type { Protocol } from '@odysseus/shared-schemas';

function boardWith(): Protocol {
  const protocol = blankProtocol();
  const [setup] = protocol.pages;
  setup.steps = [
    { id: 's1', kind: 'step', level: 1, text: 'Add {Per well} to each well', isMeanwhile: false },
  ];
  protocol.values.items = [{ id: 'v1', name: 'Per well', value: '100', unit: 'µL' }];
  protocol.calculations.items = [
    { id: 'f1', name: 'Total', formula: 'Per well * 96', unit: 'auto' },
  ];
  protocol.materials.items = [
    {
      id: 'm1',
      group: 'chem',
      type: 'Drug or inhibitor',
      name: 'Drug',
      shownFields: ['stock-concentration'],
      values: { 'stock-concentration': '10' },
      units: { 'stock-concentration': 'mM' },
      customFields: [],
      fieldLabels: {},
      isSetAside: false,
      recipe: [],
    },
  ];
  return protocol;
}

const { getState } = useWorkbenchStore;

const calculationItems = () => getState().protocol.calculations.items;

const placementOn = (draft: Protocol) => ({ page: draft.pages[0].id, x: 0, y: 0, w: 6, h: 6 });

beforeEach(() => getState().openProtocol(boardWith(), 'test.json'));

describe('workbenchStore', () => {
  it('opens a document clean and calculated', () => {
    expect(selectIsDirty(getState())).toBe(false);
    const result = getState().board.results.get('f1');
    expect(result).toMatchObject({ status: 'ok', output: { text: '9.6 mL' } });
  });

  it('carries a value rename into formulas and step references', () => {
    getState().updateProtocol(draft => {
      draft.values.items[0] = { ...draft.values.items[0], name: 'Volume per well' };
    });
    expect(calculationItems()[0].formula).toBe('{Volume per well|v1} * 96');
    expect(getState().protocol.pages[0].steps[0].text).toBe(
      'Add {Volume per well|v1} to each well'
    );
    expect(getState().board.results.get('f1')).toMatchObject({ status: 'ok' });
    expect(selectIsDirty(getState())).toBe(true);
  });

  it('carries a value moved onto a material’s row into formulas and step references', () => {
    getState().updateProtocol(draft =>
      moveValueToRow(draft, 'v1', { kind: 'material', materialId: 'm1' })
    );
    expect(getState().protocol.values.items).toMatchObject([{ id: 'v1', name: 'Per well' }]);
    expect(calculationItems()[0].formula).toBe('{Drug per well|v1} * 96');
    expect(getState().protocol.pages[0].steps[0].text).toBe('Add {Drug per well|v1} to each well');
    expect(getState().board.results.get('f1')).toMatchObject({ status: 'ok' });
  });

  it('carries a material rename into the names built from it', () => {
    getState().updateProtocol(draft => {
      draft.calculations.items.push({
        id: 'f2',
        name: 'Top',
        materialId: 'm1',
        formula: 'Drug stock conc. / 1000',
        unit: 'auto',
      });
    });
    getState().updateProtocol(draft => {
      draft.materials.items[0].name = 'Compound';
    });
    expect(getState().board.ids.get('f2')?.name).toBe('Compound top');
    expect(calculationItems()[1]).toMatchObject({
      name: 'Top',
      materialName: 'Compound',
      formula: '{Compound stock conc.|m1:stock-concentration} / 1000',
    });
  });

  it('ignores an edit that changes nothing', () => {
    getState().updateProtocol(() => undefined);
    expect(selectIsDirty(getState())).toBe(false);
  });

  it('moves to the first page when the shown page is deleted', () => {
    const second = { id: 'second', name: 'Page 2', steps: [] };
    getState().updateProtocol(draft => {
      draft.pages.push(second);
    });
    getState().showPage(second.id);
    getState().updateProtocol(draft => {
      draft.pages = draft.pages.filter(page => page.id !== second.id);
    });
    expect(getState().activePageId).toBe(getState().protocol.pages[0].id);
  });

  it('starts a new protocol on one page, Page 1, holding the starting cards', () => {
    const { pages, cards } = getState().protocol;
    expect(pages.map(page => page.name)).toEqual(['Page 1']);
    expect(cards.every(card => card.page === pages[0].id)).toBe(true);
  });

  it('is clean again after saving', () => {
    getState().updateProtocol(draft => {
      draft.title = 'Changed';
    });
    getState().markSaved('renamed.json');
    expect(selectIsDirty(getState())).toBe(false);
    expect(getState().fileName).toBe('renamed.json');
  });

  describe('plate edits', () => {
    const addPlate = (cells: Record<string, Record<string, object>>) =>
      getState().updateProtocol(draft => {
        const plateMap = {
          ...newPlateMap(),
          lines: [
            { id: 'l', name: '', role: 'auto' as const, values: [{ id: 'd', text: 'Drug' }] },
          ],
          samples: cells,
        };
        draft.plateMaps.push(plateMap);
        showPlateMap(draft, plateMap.id, placementOn(draft), 'assay');
      });

    it('removes a typed value once the plate provides the same name', () => {
      getState().updateProtocol(draft => {
        draft.values.items.push({ id: 'v2', name: 'Drug final conc.', value: '5', unit: 'µM' });
      });
      addPlate({ 'p:A1': { l: { valueId: 'd', amount: '5', unit: 'µM' } } });
      expect(getState().protocol.values.items.map(item => item.id)).toEqual(['v1']);
    });
  });

  describe('renaming a donor', () => {
    beforeEach(() =>
      getState().updateProtocol(draft => {
        const pbmc = {
          ...draft.materials.items[0],
          id: 'pbmc',
          group: 'bio',
          type: 'Primary cells',
          name: 'PBMC',
          shownFields: [],
          values: {},
          units: {},
        };
        startDonors(pbmc, [], []);
        pbmc.donors?.rows.push({
          id: 'donor-1',
          name: 'Donor 1',
          values: { 'live-cell-conc': '2000000' },
          units: {},
        });
        draft.materials.items.push(pbmc);
        const cells = { valueId: 'd1', amount: '100000', unit: 'cells' };
        const plateMap = {
          ...newPlateMap(),
          plates: [{ id: 'p1', labware: '96' as const, name: '' }],
          lines: [
            { id: 'l', name: '', role: 'band' as const, values: [{ id: 'd1', text: 'Donor 1' }] },
          ],
          samples: { 'p1:A1': { l: cells }, 'p1:A2': { l: cells } },
        };
        draft.plateMaps.push(plateMap);
        showPlateMap(draft, plateMap.id, placementOn(draft), 'assay');
      })
    );

    const renameDonor = (name: string) =>
      getState().updateProtocol(draft => {
        const donor = draft.materials.items.find(item => item.id === 'pbmc')?.donors?.rows[0];
        if (!donor) return;
        const from = donor.name;
        donor.name = name;
        plateFollowsListRename(draft, from, name);
      });

    it('carries the rename into a formula that uses its cell math', () => {
      getState().updateProtocol(draft => {
        draft.calculations.items.push({
          id: 'f2',
          name: 'Spare cells',
          formula: 'Donor 1 total needed * 2',
          unit: 'auto',
        });
      });
      expect(getState().board.results.get('f2')).toMatchObject({ status: 'ok' });
      const [before] = referenceParts(calculationItems()[1].formula);
      renameDonor('D1');
      const [after] = referenceParts(calculationItems()[1].formula);
      expect(after).toEqual({ ...before, name: 'D1 total needed' });
      expect(getState().board.results.get('f2')).toMatchObject({ status: 'ok' });
    });

    it('keeps the name given to its amount on the plate', () => {
      const amountId = [...getState().board.names.values()].find(
        entry => entry.name === 'Donor 1 cells/well'
      )?.id;
      getState().updateProtocol(draft => {
        const [plateMap] = draft.plateMaps;
        if (amountId) plateMap.amountNames[amountId.slice(plateMap.id.length + 1)] = 'Seeding';
      });
      const names = () => [...getState().board.names.values()].map(entry => entry.name);
      expect(names()).toContain('Seeding');
      renameDonor('D1');
      expect(names()).toContain('Seeding');
    });
  });
});

describe('formulas and steps point at the number', () => {
  const formulaOf = (id: string) => calculationItems().find(item => item.id === id)?.formula;
  const stepText = () => getState().protocol.pages[0].steps[0].text;
  const resultOf = (id: string) => getState().board.results.get(id);
  const addValue = (id: string, name: string, value = '50') =>
    getState().updateProtocol(draft => {
      draft.values.items.push({ id, name, value, unit: 'µL' });
    });
  const removeValue = (id: string) =>
    getState().updateProtocol(draft => {
      draft.values.items = draft.values.items.filter(item => item.id !== id);
    });

  it('links a name typed before its number exists once the number appears', () => {
    getState().updateProtocol(draft => {
      draft.calculations.items.push({
        id: 'f3',
        name: 'Twice',
        formula: 'Spare * 2',
        unit: 'auto',
      });
    });
    expect(resultOf('f3')).toMatchObject({ status: 'error', missingName: 'Spare' });
    addValue('v2', 'Spare', '5');
    expect(formulaOf('f3')).toBe('{Spare|v2} * 2');
    expect(resultOf('f3')).toMatchObject({ status: 'ok' });
  });

  it('says a removed number was removed, and undo brings it back', () => {
    removeValue('v1');
    expect(formulaOf('f1')).toBe('{Per well|v1} * 96');
    expect(resultOf('f1')).toMatchObject({
      status: 'error',
      message: 'Per well was removed',
      missingName: 'Per well',
    });
    getState().undo();
    expect(resultOf('f1')).toMatchObject({ status: 'ok', output: { text: '9.6 mL' } });
  });

  it('links again to a new number given exactly the removed name', () => {
    removeValue('v1');
    addValue('v9', 'Per well');
    expect(formulaOf('f1')).toBe('{Per well|v9} * 96');
    expect(stepText()).toBe('Add {Per well|v9} to each well');
    expect(resultOf('f1')).toMatchObject({ status: 'ok', output: { text: '4.8 mL' } });
  });

  it('never moves a reference onto another number that takes its old name', () => {
    getState().updateProtocol(draft => {
      draft.values.items[0] = { ...draft.values.items[0], name: 'Volume' };
    });
    addValue('v2', 'Per well');
    expect(formulaOf('f1')).toBe('{Volume|v1} * 96');
    expect(stepText()).toBe('Add {Volume|v1} to each well');
  });

  it('keeps the diluent on its material through a rename', () => {
    getState().updateProtocol(draft => {
      draft.diluent = 'Drug';
    });
    expect(getState().protocol.diluent).toBe('{Drug|m1}');
    getState().updateProtocol(draft => {
      draft.materials.items[0].name = 'Compound';
    });
    expect(getState().protocol.diluent).toBe('{Compound|m1}');
  });

  it('keeps the full name of a calculation whose material was removed', () => {
    getState().updateProtocol(draft => {
      draft.calculations.items.push({
        id: 'f2',
        name: 'Top',
        materialId: 'm1',
        formula: '1 mM',
        unit: 'auto',
      });
    });
    getState().updateProtocol(draft => {
      draft.materials.items = [];
    });
    expect(getState().board.ids.get('f2')?.name).toBe('Drug top');
  });

  it('settles after a change, so linking again changes nothing', () => {
    getState().updateProtocol(draft => {
      draft.calculations.items.push({
        id: 'f2',
        name: 'Top',
        materialId: 'gone',
        formula: '1',
        unit: 'auto',
      });
      draft.values.rows.push({ id: 'r1', materialId: 'gone' });
    });
    const { protocol, board } = getState();
    expect(produce(protocol, draft => linkReferences(draft, board))).toBe(protocol);
  });
});

describe('undo and redo', () => {
  const titleNow = () => getState().protocol.title;
  const retitle = (title: string) =>
    getState().updateProtocol(draft => {
      draft.title = title;
    });

  beforeEach(() => {
    vi.useFakeTimers();
    getState().openProtocol(blankProtocol(), 'plate.json');
  });
  afterEach(() => vi.useRealTimers());

  it('steps back and forward, joining edits that come close together', () => {
    retitle('A');
    vi.advanceTimersByTime(2000);
    retitle('AB');
    vi.advanceTimersByTime(200);
    retitle('ABC');
    getState().undo();
    expect(titleNow()).toBe('A');
    getState().undo();
    expect(titleNow()).toBe(blankProtocol().title);
    getState().redo();
    getState().redo();
    expect(titleNow()).toBe('ABC');
  });

  it('is clean again back at the save, and a new edit after an undo is unsaved', () => {
    retitle('Saved');
    getState().markSaved('plate.json');
    vi.advanceTimersByTime(2000);
    retitle('Later');
    getState().undo();
    expect(selectIsDirty(getState())).toBe(false);
    getState().undo();
    vi.advanceTimersByTime(2000);
    retitle('Other');
    expect(selectIsDirty(getState())).toBe(true);
    expect(getState().future).toHaveLength(0);
  });

  it('starts over when a file opens', () => {
    retitle('A');
    getState().openProtocol(blankProtocol(), 'other.json');
    getState().undo();
    expect(getState().past).toHaveLength(0);
    expect(titleNow()).toBe(blankProtocol().title);
  });
});
