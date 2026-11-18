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
  kind: 'band',
  showsOutline: true,
  showsBracket: true,
  label: 'Cells',
  amount: '',
  text: 'Cells',
  color: '#6fbf73',
  valueId: undefined,
  wellsInMap: 2,
  clusters: [column],
};
const rowBlock = (row: number, from: number, to: number): BandCluster => ({
  cells: Array.from({ length: to - from + 1 }, (_, index) => ({ row, col: from + index })),
  top: row,
  bottom: row,
  left: from,
  right: to,
  place: 'top',
});
const shapesOf = (bands: PlateBand[]) => bandShapes(bands, plateGeometry(size, 4, 6, bands));

describe('plate geometry', () => {
  it('leaves room past the last column and row for band outlines', () => {
    const plain = plateGeometry(size, 2, 3, []);
    const banded = plateGeometry(size, 2, 3, [band]);
    expect(plateWidth(plain)).toBe(16 + 3 * 44);
    expect(plateWidth(banded) - plateWidth(plain)).toBe(4);
    expect(plateHeight(banded) - plateHeight(plain)).toBe(4);
  });

  it('leaves the rings out for a line drawn as stripes', () => {
    expect(shapesOf([band]).rings).toHaveLength(2);
    expect(shapesOf([{ ...band, kind: 'stripe' }]).rings).toHaveLength(0);
  });

  it('gives the biggest blocks the two bracket lanes and tags the rest', () => {
    const blocks = [rowBlock(0, 0, 5), rowBlock(1, 0, 3), rowBlock(2, 1, 2)].map(cluster => ({
      ...band,
      clusters: [cluster],
    }));
    const shapes = shapesOf(blocks);
    expect(shapes.topBrackets).toHaveLength(2);
    expect(shapes.tags).toHaveLength(1);
  });

  it('draws no bracket or outline a line has turned off', () => {
    const quiet = {
      ...band,
      showsOutline: false,
      showsBracket: false,
      clusters: [rowBlock(0, 0, 5)],
    };
    const shapes = shapesOf([quiet]);
    expect(shapes.topBrackets).toHaveLength(0);
    expect(shapes.areas).toHaveLength(0);
    expect(plateGeometry(size, 4, 6, [quiet]).topPad).toBe(0);
  });

  it('labels every well of a scattered line, and never rings a fill label', () => {
    const scattered = { ...band, clusters: [{ ...column, place: 'well' as const }] };
    expect(shapesOf([scattered]).wellTags).toHaveLength(2);
    const label = shapesOf([{ ...band, kind: 'fill', showsOutline: false }]);
    expect(label.rings).toHaveLength(0);
    expect(label.tags).toHaveLength(1);
  });
});
