/**
 * placeLabelsOnSheets tests
 *
 * Verifies page layout invariants: at-least-one-page, startingPosition offset,
 * cross-page overflow, and skipped-slot shift behavior.
 */

import { placeLabelsOnSheets } from './BarcodeSheetModal';

import type { PrintableLabel } from './barcodeSheetTypes';
import type { SheetTemplate } from './sheetTemplates';

const TEMPLATE_3x10: SheetTemplate = {
  id: 'test',
  name: 'Test Sheet',
  description: '30 per sheet',
  paperSize: 'letter',
  paperWidth: 8.5,
  paperHeight: 11,
  labelWidth: 2.625,
  labelHeight: 1,
  columns: 3,
  rows: 10,
  marginTop: 0.5,
  marginLeft: 0.1875,
  columnGap: 0.125,
  rowGap: 0,
};

function makeLabels(count: number): PrintableLabel[] {
  return Array.from({ length: count }, (_, i) => ({
    itemId: `item_${i + 1}`,
    itemName: `Item ${i + 1}`,
    barcodeValue: `BC${i + 1}`,
  }));
}

const NO_SKIPS: ReadonlySet<number> = new Set();

describe('placeLabelsOnSheets', () => {
  it('produces a single empty page when no labels are provided', () => {
    const result = placeLabelsOnSheets([], TEMPLATE_3x10, 1, NO_SKIPS);

    expect(result.totalPages).toBe(1);
    expect(result.pageSlots).toHaveLength(1);
    expect(result.pageSlots[0]).toHaveLength(30);
    expect(result.pageSlots[0].every(s => s === null)).toBe(true);
  });

  it('respects startingPosition with leading nulls and overflows to a second page', () => {
    const labels = makeLabels(50);
    const result = placeLabelsOnSheets(labels, TEMPLATE_3x10, 5, NO_SKIPS);

    expect(result.totalPages).toBe(2);

    const page1 = result.pageSlots[0];
    expect(page1.slice(0, 4).every(s => s === null)).toBe(true);
    expect(page1[4]?.itemId).toBe('item_1');
    expect(page1[29]?.itemId).toBe('item_26');

    const page2 = result.pageSlots[1];
    expect(page2[0]?.itemId).toBe('item_27');
    expect(page2[23]?.itemId).toBe('item_50');
    expect(page2.slice(24).every(s => s === null)).toBe(true);
  });

  it('overflows to a second page when labels exceed slotsPerSheet by one', () => {
    const labels = makeLabels(31);
    const result = placeLabelsOnSheets(labels, TEMPLATE_3x10, 1, NO_SKIPS);

    expect(result.totalPages).toBe(2);
    expect(result.pageSlots[0][0]?.itemId).toBe('item_1');
    expect(result.pageSlots[0][29]?.itemId).toBe('item_30');
    expect(result.pageSlots[1][0]?.itemId).toBe('item_31');
    expect(result.pageSlots[1].slice(1).every(s => s === null)).toBe(true);
  });

  it('pushes labels forward when a slot at or after startingPosition is skipped', () => {
    const labels = makeLabels(3);
    const skipped = new Set([0, 2]);
    const result = placeLabelsOnSheets(labels, TEMPLATE_3x10, 1, skipped);

    expect(result.totalPages).toBe(1);
    const page1 = result.pageSlots[0];
    expect(page1[0]).toBe(null);
    expect(page1[1]?.itemId).toBe('item_1');
    expect(page1[2]).toBe(null);
    expect(page1[3]?.itemId).toBe('item_2');
    expect(page1[4]?.itemId).toBe('item_3');
  });

  it('ignores skips before startingPosition (no shift, no extra pages)', () => {
    const labels = makeLabels(2);
    const skipped = new Set([0, 1]);
    const result = placeLabelsOnSheets(labels, TEMPLATE_3x10, 5, skipped);

    expect(result.totalPages).toBe(1);
    const page1 = result.pageSlots[0];
    expect(page1[4]?.itemId).toBe('item_1');
    expect(page1[5]?.itemId).toBe('item_2');
  });

  it('routes all labels to page 2 when every slot on page 1 is skipped', () => {
    const labels = makeLabels(2);
    const skipped = new Set<number>();
    for (let i = 0; i < 30; i++) skipped.add(i);

    const result = placeLabelsOnSheets(labels, TEMPLATE_3x10, 1, skipped);

    expect(result.totalPages).toBe(2);
    expect(result.pageSlots[0].every(s => s === null)).toBe(true);
    expect(result.pageSlots[1][0]?.itemId).toBe('item_1');
    expect(result.pageSlots[1][1]?.itemId).toBe('item_2');
  });
});
