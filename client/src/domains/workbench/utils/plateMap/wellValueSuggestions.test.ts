import { knownNamesIn, wellValueSuggestions } from './wellValueSuggestions';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const item = (fields: Partial<MaterialItem>): MaterialItem =>
  ({
    shownFields: [],
    values: {},
    units: {},
    customFields: [],
    fieldLabels: {},
    isSetAside: false,
    recipe: [],
    ...fields,
  }) as MaterialItem;

const protocol = {
  cards: [
    {
      id: 'materials',
      type: 'materials',
      items: [
        item({
          id: 'pbmc',
          group: 'bio',
          type: 'Primary cells',
          name: 'PBMC (fresh)',
          donors: {
            label: 'Donors',
            shownFields: [],
            customFields: [],
            rows: [
              { id: 'd1', name: 'Donor 1', values: { 'donor-id': 'D-101' }, units: {} },
              { id: 'd2', name: 'Donor 2', values: { 'donor-id': 'D-102' }, units: {} },
            ],
          },
        }),
        item({
          id: 'stim',
          group: 'chem',
          type: 'Drug or inhibitor',
          name: 'Stimulant X long name',
          shownFields: ['short-name'],
          values: { 'short-name': 'Stim X' },
        }),
      ],
    },
  ],
} as unknown as Pick<Protocol, 'cards'>;

const known = knownNamesIn(protocol);
const texts = (typed: string, onLine: string[] = []) =>
  wellValueSuggestions(
    typed,
    onLine.map(text => ({ id: text, text })),
    known
  ).map(entry => [entry.text, entry.hint]);

describe('well value suggestions', () => {
  it('offers donors by name or ID, with their material and ID', () => {
    expect(texts('d-10')).toEqual([
      ['Donor 1', 'PBMC · D-101'],
      ['Donor 2', 'PBMC · D-102'],
    ]);
    expect(texts('donor 2')).toEqual([]);
    expect(texts('onor 2')).toEqual([['Donor 2', 'PBMC · D-102']]);
  });

  it('offers a material by its short name, after the values already on the line', () => {
    expect(texts('stim', ['Stim Y'])).toEqual([
      ['Stim Y', ''],
      ['Stim X', 'Drug or inhibitor'],
    ]);
  });

  it('offers nothing already typed or already on the line twice', () => {
    expect(texts('donor', ['Donor 1'])).toEqual([
      ['Donor 1', ''],
      ['Donor 2', 'PBMC · D-102'],
    ]);
  });
});
