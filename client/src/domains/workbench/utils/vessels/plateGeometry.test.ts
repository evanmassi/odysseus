import { bandShapes, plateGeometry, plateHeight, plateWidth } from './plateGeometry';

import type { BandCluster, PlateBand } from './plateLayers';

const size = { width: 40, height: 30, density: 'narrow' as const };
const column: BandCluster = {
  cells: [
    { row: 0, col: 2 },
    { row: 1, col: 2 },
  ],
  top: 0,
  bottom: 1,
  left: 2,
  right: 2,
  place: 'ring',
};
const band: PlateBand = {
  lineId: 'cells',
  isStripe: false,
  label: 'Cells',
  amount: '',
  text: 'Cells',
  color: '#6fbf73',
  valueId: undefined,
  wellsInMap: 2,
  clusters: [column],
};
describe('plate geometry', () => {
  it('leaves room past the last column and row for band outlines', () => {
    const plain = plateGeometry(size, 2, 3, []);
    const banded = plateGeometry(size, 2, 3, [band]);
    expect(plateWidth(plain)).toBe(16 + 3 * 44);
    expect(plateWidth(banded) - plateWidth(plain)).toBe(4);
    expect(plateHeight(banded) - plateHeight(plain)).toBe(4);
  });

  it('leaves the rings out for a line drawn as stripes', () => {
    const geometry = plateGeometry(size, 2, 3, [band]);
    expect(bandShapes([band], geometry).rings).toHaveLength(2);
    expect(bandShapes([{ ...band, isStripe: true }], geometry).rings).toHaveLength(0);
  });
});
