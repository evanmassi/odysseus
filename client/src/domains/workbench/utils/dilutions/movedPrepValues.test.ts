import everyCardV5 from '../protocolFile/fixtures/everyCard.v5.json';
import { readProtocolFile } from '../protocolFile/protocolFile';

import type { Protocol } from '@odysseus/shared-schemas';

type RawItem = Record<string, unknown>;

interface RawCard {
  id: string;
  items?: RawItem[];
  rows?: RawItem[];
  series?: Record<string, { prep?: Record<string, string> }>;
}

const DRUG = 'mat-drug';

function cardIn(cards: RawCard[], id: string): RawCard {
  const card = cards.find(candidate => candidate.id === id);
  if (!card) throw new Error(`no card ${id}`);
  return card;
}

function openedWith(change: (cardOf: (id: string) => RawCard) => void): Protocol {
  const file = structuredClone(everyCardV5) as unknown as { protocol: { cards: RawCard[] } };
  change(id => cardIn(file.protocol.cards, id));
  return readProtocolFile(JSON.stringify(file));
}

function prepIn(cardOf: (id: string) => RawCard): Record<string, string> {
  const prep = cardOf('card-plate').series?.['series-factor']?.prep;
  if (!prep) throw new Error('no prep on the sample series');
  return prep;
}

function drugValues(protocol: Protocol): string[] {
  const values = protocol.cards.find(card => card.type === 'values');
  if (values?.type !== 'values') return [];
  const row = values.rows.find(each => 'materialId' in each && each.materialId === DRUG);
  return values.items.flatMap(item =>
    row && item.row === row.id && 'name' in item ? [`${item.name} ${item.value} ${item.unit}`] : []
  );
}

describe('moving a series’ own numbers into Values on open', () => {
  it('leaves out a number Values already gives', () => {
    expect(drugValues(openedWith(() => {}))).toEqual(['Vol./well 20 µL']);
  });

  it('puts a number that differs from Whole experiment on the drug’s row', () => {
    const protocol = openedWith(cardOf => {
      Object.assign(prepIn(cardOf), { wellVolume: '150', extraPercent: '25' });
    });
    expect(drugValues(protocol)).toEqual([
      'Total well vol. 150 µL',
      'Vol./well 20 µL',
      'Extra (dead vol.) 25 %',
    ]);
  });

  it('keeps the hidden 20 % extra of a series that never set one', () => {
    const protocol = openedWith(cardOf => {
      delete prepIn(cardOf)['extraPercent'];
    });
    expect(drugValues(protocol)).toEqual(['Vol./well 20 µL', 'Extra (dead vol.) 20 %']);
  });

  it('keeps the drug’s own number in Values over the series’', () => {
    const protocol = openedWith(cardOf => {
      const values = cardOf('card-values');
      values.rows?.push({ id: 'row-drug', materialId: DRUG });
      values.items?.push({
        id: 'own',
        name: 'Vol./well',
        value: '30',
        unit: 'µL',
        row: 'row-drug',
      });
    });
    expect(drugValues(protocol)).toEqual(['Vol./well 30 µL']);
  });

  it('points formulas that used the series’ own names at the shared ones', () => {
    const protocol = openedWith(cardOf => {
      cardOf('card-calculations').items?.push({
        id: 'old-names',
        name: 'Old names',
        formula: 'Drug X volume added × Drug X total well vol.',
        unit: '',
      });
    });
    const calculations = protocol.cards.find(card => card.type === 'calculations');
    expect(
      calculations?.type === 'calculations' &&
        calculations.items.find(item => item.id === 'old-names')?.formula
    ).toBe('Drug X vol./well × Total well vol.');
  });
});
