import { createCard } from '../utils/cards/createCard';
import { startDonors } from '../utils/materials/materialDonors';
import { plateFollowsListRename } from '../utils/materials/renameFollowing';
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
    expect(calculationItems()[0].formula).toBe('Volume per well * 96');
    expect(getState().protocol.pages[0].steps[0].text).toBe('Add {Volume per well} to each well');
    expect(getState().board.results.get('f1')).toMatchObject({ status: 'ok' });
    expect(selectIsDirty(getState())).toBe(true);
  });

  it('carries a value moved onto a material’s row into formulas and step references', () => {
    getState().updateProtocol(draft =>
      moveValueToRow(draft, 'v1', { kind: 'material', materialId: 'm1' })
    );
    expect(getState().protocol.values.items).toMatchObject([{ id: 'v1', name: 'Per well' }]);
    expect(calculationItems()[0].formula).toBe('Drug per well * 96');
    expect(getState().protocol.pages[0].steps[0].text).toBe('Add {Drug per well} to each well');
    expect(getState().board.results.get('f1')).toMatchObject({ status: 'ok' });
  });

  it('carries a material rename into the names built from it', () => {
    getState().updateProtocol(draft => {
      draft.calculations.items.push({
        id: 'f2',
        name: 'Drug top',
        formula: 'Drug stock concentration / 1000',
        unit: 'auto',
      });
    });
    getState().updateProtocol(draft => {
      draft.materials.items[0].name = 'Compound';
    });
    expect(calculationItems()[1]).toMatchObject({
      name: 'Compound top',
      formula: 'Compound stock concentration / 1000',
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
        const plateMap = createCard('plateMap', {
          page: draft.pages[0].id,
          x: 0,
          y: 0,
          w: 6,
          h: 6,
        });
        if (plateMap.type !== 'plateMap') return;
        plateMap.lines = [{ id: 'l', name: '', role: 'auto', values: [{ id: 'd', text: 'Drug' }] }];
        plateMap.samples = cells;
        draft.cards.push(plateMap);
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
        const plateMap = createCard('plateMap', {
          page: draft.pages[0].id,
          x: 0,
          y: 0,
          w: 6,
          h: 6,
        });
        if (plateMap.type !== 'plateMap') return;
        plateMap.plates = [{ id: 'p1', labware: '96', name: '' }];
        plateMap.lines = [
          { id: 'l', name: '', role: 'band', values: [{ id: 'd1', text: 'Donor 1' }] },
        ];
        const cells = { valueId: 'd1', amount: '100000', unit: 'cells' };
        plateMap.samples = { 'p1:A1': { l: cells }, 'p1:A2': { l: cells } };
        draft.cards.push(plateMap);
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
      renameDonor('D1');
      expect(calculationItems()[1].formula).toBe('D1 total needed * 2');
      expect(getState().board.results.get('f2')).toMatchObject({ status: 'ok' });
    });

    it('keeps the name given to its amount on the plate', () => {
      const amountId = [...getState().board.names.values()].find(
        entry => entry.name === 'Donor 1 cells/well'
      )?.id;
      getState().updateProtocol(draft => {
        const plateMap = draft.cards.find(card => card.type === 'plateMap');
        if (plateMap?.type === 'plateMap' && amountId)
          plateMap.amountNames[amountId.slice(plateMap.id.length + 1)] = 'Seeding';
      });
      const names = () => [...getState().board.names.values()].map(entry => entry.name);
      expect(names()).toContain('Seeding');
      renameDonor('D1');
      expect(names()).toContain('Seeding');
    });
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
