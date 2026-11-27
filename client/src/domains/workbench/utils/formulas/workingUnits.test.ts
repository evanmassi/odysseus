import { cancelledUnits, quantityText } from './workingUnits';

import type { WorkingFraction, WorkingNode } from './workingTree';

const ref = (name: string, text: string): WorkingNode => ({
  kind: 'ref',
  name,
  text,
  source: 'value',
  isSetAside: false,
});

const struck = (fraction: WorkingFraction) =>
  [...cancelledUnits(fraction)].map(([node, parts]) => [
    node.kind === 'ref' ? node.name : '',
    [...parts].sort(),
  ]);

describe('a number and its unit', () => {
  it('splits the amount from the unit', () => {
    expect(quantityText('4.56E+6 cells/mL')).toEqual({ amount: '4.56E+6', unit: 'cells/mL' });
    expect(quantityText('20%')).toEqual({ amount: '20%', unit: '' });
  });
});

describe('units that cancel', () => {
  it('crosses out a concentration over the same kind of concentration', () => {
    const working = ref('Top working conc.', '1.2 µM');
    const volume = ref('Top vol.', '435 µL');
    const stock = ref('Stock conc.', '19.48 µM');
    expect(struck({ over: [working, volume], under: [stock] })).toEqual([
      ['Top working conc.', ['top']],
      ['Stock conc.', ['top']],
    ]);
  });

  it('crosses out cells over cells/mL and leaves the mL', () => {
    const live = ref('Live cells', '4.56E+7 cells');
    const plating = ref('Plating conc.', '1.00E+6 cells/mL');
    expect(struck({ over: [live], under: [plating] })).toEqual([
      ['Live cells', ['top']],
      ['Plating conc.', ['top']],
    ]);
  });

  it('crosses out a volume against a per-volume in a product', () => {
    const conc = ref('Live cell conc.', '4.56E+6 cells/mL');
    const volume = ref('Vol.', '10 mL');
    expect(struck({ over: [conc, volume], under: [] })).toEqual([
      ['Vol.', ['top']],
      ['Live cell conc.', ['bottom']],
    ]);
  });

  it('leaves units of different kinds alone', () => {
    const cells = ref('Cells/well', '4.00E+4 cells');
    const volume = ref('Vol./well', '40 µL');
    expect(struck({ over: [cells], under: [volume] })).toEqual([]);
  });
});
