import { createCard } from '../utils/cards/createCard';
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
  for (const card of protocol.cards) {
    if (card.type === 'values')
      card.items = [{ id: 'v1', name: 'Per well', value: '100', unit: 'µL' }];
    if (card.type === 'calculations')
      card.items = [{ id: 'f1', name: 'Total', formula: 'Per well * 96', unit: 'auto' }];
    if (card.type === 'materials') {
      card.items = [
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
    }
  }
  return protocol;
}

const { getState } = useWorkbenchStore;

const cardOf = <Type extends Protocol['cards'][number]['type']>(type: Type) => {
  const card = getState().protocol.cards.find(candidate => candidate.type === type);
  if (card?.type !== type) throw new Error(`no ${type}`);
  return card as Extract<Protocol['cards'][number], { type: Type }>;
};

beforeEach(() => getState().openProtocol(boardWith(), 'test.json'));

describe('workbenchStore', () => {
  it('opens a document clean and calculated', () => {
    expect(selectIsDirty(getState())).toBe(false);
    const result = getState().board.results.get('f1');
    expect(result).toMatchObject({ status: 'ok', output: { text: '9.6 mL' } });
  });

  it('carries a value rename into formulas and step references', () => {
    getState().updateProtocol(draft => {
      const values = draft.cards.find(card => card.type === 'values');
      if (values?.type === 'values')
        values.items[0] = { ...values.items[0], name: 'Volume per well' };
    });
    expect(cardOf('calculations').items[0].formula).toBe('Volume per well * 96');
    expect(getState().protocol.pages[0].steps[0].text).toBe('Add {Volume per well} to each well');
    expect(getState().board.results.get('f1')).toMatchObject({ status: 'ok' });
    expect(selectIsDirty(getState())).toBe(true);
  });

  it('carries a value moved onto a material’s row into formulas and step references', () => {
    const valuesCardId = cardOf('values').id;
    getState().updateProtocol(draft =>
      moveValueToRow(draft, valuesCardId, 'v1', { kind: 'material', materialId: 'm1' })
    );
    expect(cardOf('values').items).toMatchObject([{ id: 'v1', name: 'Per well' }]);
    expect(cardOf('calculations').items[0].formula).toBe('Drug per well * 96');
    expect(getState().protocol.pages[0].steps[0].text).toBe('Add {Drug per well} to each well');
    expect(getState().board.results.get('f1')).toMatchObject({ status: 'ok' });
  });

  it('carries a material rename into the names built from it', () => {
    getState().updateProtocol(draft => {
      const calculationsCard = draft.cards.find(card => card.type === 'calculations');
      if (calculationsCard?.type === 'calculations') {
        calculationsCard.items.push({
          id: 'f2',
          name: 'Drug top',
          formula: 'Drug stock concentration / 1000',
          unit: 'auto',
        });
      }
    });
    getState().updateProtocol(draft => {
      const materials = draft.cards.find(card => card.type === 'materials');
      if (materials?.type === 'materials') materials.items[0].name = 'Compound';
    });
    expect(cardOf('calculations').items[1]).toMatchObject({
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
        const values = draft.cards.find(card => card.type === 'values');
        if (values?.type === 'values')
          values.items.push({ id: 'v2', name: 'Drug final conc.', value: '5', unit: 'µM' });
      });
      addPlate({ 'p:A1': { l: { valueId: 'd', amount: '5', unit: 'µM' } } });
      expect(cardOf('values').items.map(item => item.id)).toEqual(['v1']);
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
