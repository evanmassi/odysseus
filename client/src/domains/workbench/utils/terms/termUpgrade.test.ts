import { withSettledWords } from './termUpgrade';

import type { FormulaBlock, Protocol, ValuesBlock } from '@odysseus/shared-schemas';

type ValueItem = { id: string; name: string; value: string; unit: string };

function protocolWith(values: ValueItem[], exprs: string[], stepText = ''): Protocol {
  return {
    pages: [
      {
        id: 'page',
        name: 'Setup',
        steps: stepText
          ? [{ id: 's1', kind: 'step', level: 1, text: stepText, isMeanwhile: false }]
          : [],
      },
    ],
    blocks: [
      { id: 'values', type: 'values', page: 'page', sections: [], items: values },
      {
        id: 'formulas',
        type: 'formula',
        page: 'page',
        items: exprs.map((expr, index) => ({
          id: `f${index}`,
          name: `Result ${index}`,
          expr,
          unit: '',
        })),
        materialSections: [],
      },
    ],
  } as unknown as Protocol;
}

const blockOf = <T extends Protocol['blocks'][number]['type']>(protocol: Protocol, type: T) =>
  protocol.blocks.find(block => block.type === type);

const valueNames = (protocol: Protocol) =>
  (blockOf(protocol, 'values') as ValuesBlock).items.map(item => ('name' in item ? item.name : ''));

const exprs = (protocol: Protocol) =>
  (blockOf(protocol, 'formula') as FormulaBlock).items.map(item => item.expr);

describe('settling the words of an opened file', () => {
  it('files a typed value under the standard word and follows it in calculations and steps', () => {
    const upgraded = withSettledWords(
      protocolWith(
        [{ id: 'o', name: 'Overage', value: '10', unit: '%' }],
        ['Overage × 2'],
        'Add {Overage} on top.'
      )
    );
    expect(valueNames(upgraded)).toEqual(['Extra (dead vol.)']);
    expect(exprs(upgraded)).toEqual(['Extra (dead vol.) × 2']);
    expect(upgraded.pages[0].steps[0].text).toBe('Add {Extra (dead vol.)} on top.');
  });

  it('points an old plating concentration reference at plating conc.', () => {
    const upgraded = withSettledWords(
      protocolWith(
        [{ id: 'p', name: 'Raji plating conc.', value: '1e6', unit: 'cells/mL' }],
        ['Raji plating concentration × 2'],
        'Plate at {Raji plating concentration}.'
      )
    );
    expect(exprs(upgraded)).toEqual(['Raji plating conc. × 2']);
    expect(upgraded.pages[0].steps[0].text).toBe('Plate at {Raji plating conc.}.');
  });

  it('changes nothing more when a settled file is opened again', () => {
    const once = withSettledWords(
      protocolWith([{ id: 'o', name: 'Overage', value: '10', unit: '%' }], ['1 + Overage'])
    );
    expect(withSettledWords(once)).toEqual(once);
    expect(exprs(once)).toEqual(['1 + Extra (dead vol.)']);
  });

  it('points an old name at the name that now carries the standard word', () => {
    const upgraded = withSettledWords(
      protocolWith(
        [{ id: 'v', name: 'Drug vol./well', value: '20', unit: 'µL' }],
        ['Drug volume per well × 3']
      )
    );
    expect(exprs(upgraded)).toEqual(['Drug vol./well × 3']);
  });

  it('renames a generated name that the list only knows as a former one', () => {
    const upgraded = withSettledWords(
      protocolWith(
        [{ id: 'f', name: 'Drug X dil. factor', value: '3', unit: '1:DF' }],
        ['Drug X fold × 2']
      )
    );
    expect(exprs(upgraded)).toEqual(['Drug X dil. factor × 2']);
  });

  it('leaves a value with no unit, and a reference that is still a real name, as they were', () => {
    const protocol = protocolWith(
      [
        { id: 'w', name: 'Well volume', value: '80', unit: '' },
        { id: 'n', name: 'Raji needed', value: '5', unit: '' },
        { id: 't', name: 'Raji total needed', value: '6', unit: '' },
      ],
      ['Raji needed + Well volume']
    );
    const upgraded = withSettledWords(protocol);
    expect(valueNames(upgraded)).toEqual(['Well volume', 'Raji needed', 'Raji total needed']);
    expect(exprs(upgraded)).toEqual(['Raji needed + Well volume']);
  });
});
