import { plateGeometry, plateHeight, plateWidth } from './plateGeometry';

import type { PlateBand } from './plateLayers';

const size = { width: 40, height: 30, density: 'narrow' as const };
const band: PlateBand = {
  text: 'Cells',
  color: '#6fbf73',
  valueId: undefined,
  wellsInMap: 2,
  clusters: [
    {
      cells: [
        { row: 0, col: 2 },
        { row: 1, col: 2 },
      ],
      top: 0,
      bottom: 1,
      left: 2,
      right: 2,
      place: 'ring',
    },
  ],
};

describe('plate geometry', () => {
  it('leaves room past the last column and row for band outlines', () => {
    const plain = plateGeometry(size, 2, 3, []);
    const banded = plateGeometry(size, 2, 3, [band]);
    expect(plateWidth(plain)).toBe(16 + 3 * 44);
    expect(plateWidth(banded) - plateWidth(plain)).toBe(4);
    expect(plateHeight(banded) - plateHeight(plain)).toBe(4);
  });
});
