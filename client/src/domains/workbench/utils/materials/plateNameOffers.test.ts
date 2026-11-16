import { materialNamed } from './materialLookup';
import { linkPlateName, plateNameOffers, plateOfferKey } from './plateNameOffers';

import type { Protocol } from '@odysseus/shared-schemas';

const material = (id: string, name: string) => ({
  id,
  group: 'bio',
  type: 'Other',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isDropped: false,
});

function protocolWith(names: string[], ignored: string[] = []): Protocol {
  return {
    ignoredReadings: ignored,
    blocks: [
      {
        id: 'materials',
        type: 'materials',
        items: [material('m-raji', 'Raji-Luc'), material('m-stim', 'Stim X description')],
      },
      {
        id: 'values',
        type: 'values',
        items: [],
        sections: [{ id: 'mix', mixName: 'Th17 cocktail' }],
      },
      {
        id: 'map',
        type: 'plate',
        title: 'Plate',
        lines: [
          {
            id: 'line',
            name: '',
            role: 'auto',
            values: names.map(name => ({ id: name, text: name, color: '#123456' })),
          },
        ],
        cells: Object.fromEntries(
          names.map((name, index) => [`p:A${index + 1}`, { line: { valueId: name } }])
        ),
      },
    ],
  } as unknown as Protocol;
}

describe('plate names offered to Materials', () => {
  it('offers names with no material, mix or condition wording', () => {
    const protocol = protocolWith([
      'STX',
      'Raji-Luc',
      'Raji-Luc + T cells',
      'Th17 cocktail',
      'Targets only',
      'No drug',
      'Control',
      'IL-6 standard',
      'Anti-CD3',
    ]);
    expect(plateNameOffers(protocol).map(offer => [offer.name, offer.wellCount])).toEqual([
      ['STX', 1],
      ['IL-6 standard', 1],
      ['Anti-CD3', 1],
    ]);
  });

  it('leaves out names you ignored', () => {
    const protocol = protocolWith(['STX', 'Anti-CD3'], [plateOfferKey('STX')]);
    expect(plateNameOffers(protocol).map(offer => offer.name)).toEqual(['Anti-CD3']);
  });

  it('links a plate name to a listed material by putting the short name first', () => {
    const protocol = protocolWith(['STX']);
    linkPlateName(protocol, 'STX', 'm-stim');
    expect(materialNamed(protocol, 'STX')?.name).toBe('STX (Stim X description)');
    expect(plateNameOffers(protocol)).toEqual([]);
  });

  it('links without wrapping a name inside another', () => {
    const protocol = protocolWith(['SXT']);
    linkPlateName(protocol, 'STX', 'm-stim');
    linkPlateName(protocol, 'SXT', 'm-stim');
    expect(materialNamed(protocol, 'SXT')?.name).toBe('SXT (STX, Stim X description)');
  });
});
