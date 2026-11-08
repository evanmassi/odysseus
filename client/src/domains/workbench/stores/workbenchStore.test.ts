import { blankProtocol } from '../utils/protocolFile/blankProtocol';

import { selectIsDirty, useWorkbenchStore } from './workbenchStore';

import type { Protocol } from '@odysseus/shared-schemas';

function boardWith(): Protocol {
  const protocol = blankProtocol();
  const [setup] = protocol.pages;
  setup.steps = [
    { id: 's1', kind: 'step', level: 1, text: 'Add {Per well} to each well', isMeanwhile: false },
  ];
  for (const block of protocol.blocks) {
    if (block.type === 'values')
      block.items = [{ id: 'v1', name: 'Per well', value: '100', unit: 'µL' }];
    if (block.type === 'formula')
      block.items = [{ id: 'f1', name: 'Total', expr: 'Per well * 96', unit: 'auto' }];
    if (block.type === 'materials') {
      block.items = [
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
          isDropped: false,
        },
      ];
    }
  }
  return protocol;
}

const { getState } = useWorkbenchStore;

const blockOf = <Type extends Protocol['blocks'][number]['type']>(type: Type) => {
  const block = getState().protocol.blocks.find(candidate => candidate.type === type);
  if (block?.type !== type) throw new Error(`no ${type}`);
  return block as Extract<Protocol['blocks'][number], { type: Type }>;
};

beforeEach(() => getState().openProtocol(boardWith(), 'test.json'));

describe('workbenchStore', () => {
  it('opens a document clean and calculated', () => {
    expect(selectIsDirty(getState())).toBe(false);
    const result = getState().calculation.results.get('f1');
    expect(result).toMatchObject({ status: 'ok', output: { text: '9.6 mL' } });
  });

  it('carries a value rename into formulas and step references', () => {
    getState().updateProtocol(draft => {
      const values = draft.blocks.find(block => block.type === 'values');
      if (values?.type === 'values')
        values.items[0] = { ...values.items[0], name: 'Volume per well' };
    });
    expect(blockOf('formula').items[0].expr).toBe('Volume per well * 96');
    expect(getState().protocol.pages[0].steps[0].text).toBe('Add {Volume per well} to each well');
    expect(getState().calculation.results.get('f1')).toMatchObject({ status: 'ok' });
    expect(selectIsDirty(getState())).toBe(true);
  });

  it('carries a material rename into the names built from it', () => {
    getState().updateProtocol(draft => {
      const formula = draft.blocks.find(block => block.type === 'formula');
      if (formula?.type === 'formula') {
        formula.items.push({
          id: 'f2',
          name: 'Drug top',
          expr: 'Drug stock concentration / 1000',
          unit: 'auto',
        });
      }
    });
    getState().updateProtocol(draft => {
      const materials = draft.blocks.find(block => block.type === 'materials');
      if (materials?.type === 'materials') materials.items[0].name = 'Compound';
    });
    expect(blockOf('formula').items[1]).toMatchObject({
      name: 'Compound top',
      expr: 'Compound stock concentration / 1000',
    });
  });

  it('ignores an edit that changes nothing', () => {
    getState().updateProtocol(() => undefined);
    expect(selectIsDirty(getState())).toBe(false);
  });

  it('moves to the first page when the shown page is deleted', () => {
    const [, second] = getState().protocol.pages;
    getState().showPage(second.id);
    getState().updateProtocol(draft => {
      draft.pages = draft.pages.filter(page => page.id !== second.id);
    });
    expect(getState().activePageId).toBe(getState().protocol.pages[0].id);
  });

  it('is clean again after saving', () => {
    getState().updateProtocol(draft => {
      draft.title = 'Changed';
    });
    getState().markSaved('renamed.json');
    expect(selectIsDirty(getState())).toBe(false);
    expect(getState().fileName).toBe('renamed.json');
  });
});
