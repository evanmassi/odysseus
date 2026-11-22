import { indicatorShapes, plateGeometry, plateHeight, plateWidth } from './plateGeometry';

import type { IndicatorCluster, PlateIndicator } from './plateLayers';

const size = { width: 40, height: 30, density: 'narrow' as const };
const column: IndicatorCluster = {
  cells: [
    { row: 0, col: 2 },
    { row: 1, col: 2 },
  ],
  top: 0,
  bottom: 1,
  left: 2,
  right: 2,
  place: 'wellBorder',
};
const indicator: PlateIndicator = {
  lineId: 'cells',
  kind: 'band',
  showsOutline: true,
  showsBracket: true,
  label: 'Cells',
  text: 'Cells',
  color: '#6fbf73',
  valueId: undefined,
  wellsInMap: 2,
  clusters: [column],
};
const rowCluster = (row: number, from: number, to: number): IndicatorCluster => ({
  cells: Array.from({ length: to - from + 1 }, (_, index) => ({ row, col: from + index })),
  top: row,
  bottom: row,
  left: from,
  right: to,
  place: 'bracketTop',
});
const shapesOf = (indicators: PlateIndicator[]) =>
  indicatorShapes(indicators, plateGeometry(size, 4, 6, indicators));

describe('plate geometry', () => {
  it('leaves room past the last column and row for band outlines', () => {
    const plain = plateGeometry(size, 2, 3, []);
    const banded = plateGeometry(size, 2, 3, [indicator]);
    expect(plateWidth(plain)).toBe(16 + 3 * 44);
    expect(plateWidth(banded) - plateWidth(plain)).toBe(4);
    expect(plateHeight(banded) - plateHeight(plain)).toBe(4);
  });

  it('leaves the well borders out for a line drawn as stripes', () => {
    expect(shapesOf([indicator]).rings).toHaveLength(2);
    expect(shapesOf([{ ...indicator, kind: 'stripe' }]).rings).toHaveLength(0);
  });

  it('gives the biggest clusters the two bracket lanes and tags the rest', () => {
    const rowIndicators = [rowCluster(0, 0, 5), rowCluster(1, 0, 3), rowCluster(2, 1, 2)].map(
      cluster => ({
        ...indicator,
        clusters: [cluster],
      })
    );
    const shapes = shapesOf(rowIndicators);
    expect(shapes.topBrackets).toHaveLength(2);
    expect(shapes.tags).toHaveLength(1);
  });

  it('draws no bracket or outline a line has turned off', () => {
    const quiet = {
      ...indicator,
      showsOutline: false,
      showsBracket: false,
      clusters: [rowCluster(0, 0, 5)],
    };
    const shapes = shapesOf([quiet]);
    expect(shapes.topBrackets).toHaveLength(0);
    expect(shapes.areas).toHaveLength(0);
    expect(plateGeometry(size, 4, 6, [quiet]).topPad).toBe(0);
  });

  it('labels every well of a scattered line, and never borders a fill label', () => {
    const scattered = { ...indicator, clusters: [{ ...column, place: 'inWell' as const }] };
    expect(shapesOf([scattered]).wellTags).toHaveLength(2);
    const label = shapesOf([{ ...indicator, kind: 'fill', showsOutline: false }]);
    expect(label.rings).toHaveLength(0);
    expect(label.tags).toHaveLength(1);
  });
});
