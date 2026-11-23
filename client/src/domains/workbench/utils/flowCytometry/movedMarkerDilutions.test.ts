import everyCardV6 from '../protocolFile/fixtures/everyCard.v6.json';
import { openedWith as openedSampleWith, type CardOf } from '../protocolFile/fixtures/sampleEdits';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const openedWith = (change: (cardOf: CardOf) => void) => openedSampleWith(everyCardV6, change);

function rawMaterial(cardOf: CardOf, id: string): Record<string, unknown> {
  const item = cardOf('card-materials').items?.find(candidate => candidate['id'] === id);
  if (!item) throw new Error(`no material ${id}`);
  return item;
}

function clearAmount(cardOf: CardOf, id: string, unit?: string) {
  const item = rawMaterial(cardOf, id) as unknown as MaterialItem;
  delete item.values['amount'];
  item.shownFields = item.shownFields.filter(key => key !== 'amount');
  if (unit) item.units['amount'] = unit;
  else delete item.units['amount'];
}

function materialIn(protocol: Protocol, id: string): MaterialItem {
  const item = protocol.cards
    .flatMap(card => (card.type === 'materials' ? card.items : []))
    .find(candidate => candidate.id === id);
  if (!item) throw new Error(`no material ${id}`);
  return item;
}

describe('moving a marker’s dilution into Materials on open', () => {
  it('fills a blank Amount with the panel’s dilution as 1:N and shows it', () => {
    const cd3 = materialIn(
      openedWith(cardOf => clearAmount(cardOf, 'mat-cd3', 'µL')),
      'mat-cd3'
    );
    expect(cd3.values['amount']).toBe('200');
    expect(cd3.units['amount']).toBe('1:N');
    expect(cd3.shownFields).toContain('amount');
  });

  it('keeps the Amount Materials already has', () => {
    const cd8 = materialIn(
      openedWith(() => {}),
      'mat-cd8'
    );
    expect([cd8.values['amount'], cd8.units['amount']]).toEqual(['5', 'µL']);
  });

  it('gives an isotype control the dilution it was run at', () => {
    const iso = materialIn(
      openedWith(cardOf => {
        Object.assign(rawMaterial(cardOf, 'mat-cd3'), { type: 'Isotype control' });
        clearAmount(cardOf, 'mat-cd3');
      }),
      'mat-cd3'
    );
    expect([iso.values['amount'], iso.units['amount']]).toEqual(['200', '1:N']);
  });

  it('points formulas that used the panel’s own names at the Materials ones', () => {
    const protocol = openedWith(cardOf => {
      cardOf('card-calculations').items?.push({
        id: 'old-names',
        name: 'Old names',
        formula: 'CD3 BV421 dilution factor + CD8 PE dilution factor + CD8 PE amount per well',
        unit: '',
      });
    });
    const calculations = protocol.cards.find(card => card.type === 'calculations');
    expect(
      calculations?.type === 'calculations' &&
        calculations.items.find(item => item.id === 'old-names')?.formula
    ).toBe('CD3 BV421 dil. + CD8 PE per test + CD8 PE vol./well');
  });
});
