/**
 * Label Sheet Templates
 *
 * Static definitions of common off-the-shelf label sheet layouts (Avery, etc.)
 * for bulk barcode printing. Paper sizes and label geometry are in inches.
 */

import type { LabelSize } from './SupplyBarcodePrint';

export interface SheetTemplate {
  id: string;
  name: string;
  description: string;
  paperSize: 'letter' | 'a4';
  paperWidth: number;
  paperHeight: number;
  labelWidth: number;
  labelHeight: number;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  columnGap: number;
  rowGap: number;
}

export const SHEET_TEMPLATES: readonly SheetTemplate[] = [
  {
    id: 'avery-5160',
    name: 'Avery 5160 / 8160',
    description: 'Address · Letter · 30 per sheet',
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
  },
  {
    id: 'avery-5161',
    name: 'Avery 5161 / 8161',
    description: 'Mid-size · Letter · 20 per sheet',
    paperSize: 'letter',
    paperWidth: 8.5,
    paperHeight: 11,
    labelWidth: 4,
    labelHeight: 1,
    columns: 2,
    rows: 10,
    marginTop: 0.5,
    marginLeft: 0.15625,
    columnGap: 0.1875,
    rowGap: 0,
  },
  {
    id: 'avery-5163',
    name: 'Avery 5163 / 8163',
    description: 'Shipping · Letter · 10 per sheet',
    paperSize: 'letter',
    paperWidth: 8.5,
    paperHeight: 11,
    labelWidth: 4,
    labelHeight: 2,
    columns: 2,
    rows: 5,
    marginTop: 0.5,
    marginLeft: 0.15625,
    columnGap: 0.1875,
    rowGap: 0,
  },
  {
    id: 'avery-5164',
    name: 'Avery 5164 / 8164',
    description: 'Large shipping · Letter · 6 per sheet',
    paperSize: 'letter',
    paperWidth: 8.5,
    paperHeight: 11,
    labelWidth: 4,
    labelHeight: 3.33,
    columns: 2,
    rows: 3,
    marginTop: 0.5,
    marginLeft: 0.15625,
    columnGap: 0.1875,
    rowGap: 0,
  },
  {
    id: 'avery-5167',
    name: 'Avery 5167 / 8167',
    description: 'Return address · Letter · 80 per sheet',
    paperSize: 'letter',
    paperWidth: 8.5,
    paperHeight: 11,
    labelWidth: 1.75,
    labelHeight: 0.5,
    columns: 4,
    rows: 20,
    marginTop: 0.5,
    marginLeft: 0.3,
    columnGap: 0.3,
    rowGap: 0,
  },
  {
    id: 'avery-l7160',
    name: 'Avery L7160',
    description: 'Address · A4 · 21 per sheet',
    paperSize: 'a4',
    paperWidth: 8.27,
    paperHeight: 11.69,
    labelWidth: 2.5,
    labelHeight: 1.5,
    columns: 3,
    rows: 7,
    marginTop: 0.59,
    marginLeft: 0.28,
    columnGap: 0.1,
    rowGap: 0,
  },
  {
    id: 'avery-l7163',
    name: 'Avery L7163',
    description: 'Shipping · A4 · 14 per sheet',
    paperSize: 'a4',
    paperWidth: 8.27,
    paperHeight: 11.69,
    labelWidth: 3.9,
    labelHeight: 1.5,
    columns: 2,
    rows: 7,
    marginTop: 0.59,
    marginLeft: 0.2,
    columnGap: 0.1,
    rowGap: 0,
  },
];

export const DEFAULT_TEMPLATE_ID = 'avery-5160';

export function getTemplateById(id: string): SheetTemplate | undefined {
  return SHEET_TEMPLATES.find(t => t.id === id);
}

// Minimum font sizes (inches) keep the smallest templates readable —
// Avery 5167 is only 0.5" tall, which would otherwise compute to ~3pt.
const MIN_NAME_FONT_IN = 0.07;
const MIN_META_FONT_IN = 0.055;

export function deriveLabelSize(template: SheetTemplate): LabelSize {
  return {
    name: template.name,
    width: template.labelWidth,
    height: template.labelHeight,
    nameFont: Math.max(MIN_NAME_FONT_IN, template.labelHeight * 0.13),
    metaFont: Math.max(MIN_META_FONT_IN, template.labelHeight * 0.09),
  };
}
