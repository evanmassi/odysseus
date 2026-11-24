import { blankProtocol } from '../protocolFile/blankProtocol';

import { withWellVolumeInAssaySetup } from './wellVolumeInAssaySetup';

import type { MaterialItem, Protocol, ValuesCard } from '@odysseus/shared-schemas';

const drug = (id: string, name: string): MaterialItem => ({
  id,
  group: 'chem',
  type: 'Drug or inhibitor',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isSetAside: false,
  recipe: [],
});

function protocolWith(items: ValuesCard['items']): Protocol {
  const protocol = blankProtocol();
  protocol.pages[0].steps = [
    {
      id: 's1',
      kind: 'step',
      level: 1,
      text: 'Fill to {Drug X total well vol.}.',
      isMeanwhile: false,
    },
  ];
  for (const card of protocol.cards) {
    if (card.type === 'materials') card.items = [drug('m1', 'Drug X'), drug('m2', 'Drug Y')];
    if (card.type === 'values') {
      card.rows = [
        { id: 'r1', materialId: 'm1' },
        { id: 'r2', materialId: 'm2' },
      ];
      card.items = items;
    }
  }
  return protocol;
}

const valuesOf = (protocol: Protocol) =>
  protocol.cards.find((card): card is ValuesCard => card.type === 'values')?.items;

describe('the total well vol. lives in Assay setup', () => {
  it('lifts a drug’s copy into Assay setup, and steps follow', () => {
    const opened = withWellVolumeInAssaySetup(
      protocolWith([
        { id: 'w1', name: 'Total well vol.', value: '80', unit: 'µL', row: 'r1' },
        { id: 'w2', name: 'Total well vol.', value: '80', unit: 'µL', row: 'r2' },
        { id: 'v1', name: 'Vol./well', value: '40', unit: 'µL', row: 'r1' },
      ])
    );
    expect(valuesOf(opened)).toEqual([
      { id: 'v1', name: 'Vol./well', value: '40', unit: 'µL', row: 'r1' },
      { id: 'w1', name: 'Total well vol.', value: '80', unit: 'µL' },
    ]);
    expect(opened.pages[0].steps[0]).toMatchObject({ text: 'Fill to {Total well vol.}.' });
  });

  it('leaves copies that disagree on their rows', () => {
    const protocol = protocolWith([
      { id: 'w1', name: 'Total well vol.', value: '80', unit: 'µL', row: 'r1' },
      { id: 'w2', name: 'Total well vol.', value: '160', unit: 'µL', row: 'r2' },
    ]);
    expect(withWellVolumeInAssaySetup(protocol)).toBe(protocol);
  });

  it('keeps an Assay setup value that is already there', () => {
    const protocol = protocolWith([
      { id: 'g1', name: 'Total well vol.', value: '100', unit: 'µL' },
      { id: 'w1', name: 'Total well vol.', value: '80', unit: 'µL', row: 'r1' },
    ]);
    expect(withWellVolumeInAssaySetup(protocol)).toBe(protocol);
  });
});
