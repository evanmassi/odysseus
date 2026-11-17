import { bandColorOf, lineValueOf, type VesselMapBlock } from '@odysseus/shared-schemas';

import { formatNumber } from '../formulas/quantities';
import { findNamed } from '../materials/materialLookup';

import { cellCount, isRatioAt, partnerName, ratioPartner } from './cellRatios';
import { wellLine } from './wellContents';

import type { LineLayer } from './plateLayers';
import type { BoardCalculation } from '../formulas/boardCalculation';
import type { SourceSummary } from '../materials/materialSources';

export type WellTooltipRow =
  | { kind: 'line'; color: string | undefined; name: string; amount: string; unit: string }
  | { kind: 'detail'; text: string }
  | { kind: 'ratio'; ratio: string; between: string };

export interface WellTooltip {
  heading: string;
  rows: WellTooltipRow[];
}

const CELLS = 'cells';

function splitAmount(readable: string): { amount: string; unit: string } {
  const gap = readable.indexOf(' ');
  return gap < 0
    ? { amount: readable, unit: '' }
    : { amount: readable.slice(0, gap), unit: readable.slice(gap + 1) };
}

function markColor(block: VesselMapBlock, layer: LineLayer, key: string): string | undefined {
  const value = lineValueOf(layer.line, block.cells[key]?.[layer.line.id]);
  if (!value) return undefined;
  if (layer.role === 'color') return value.color;
  return layer.role === 'band' || layer.role === 'stripe' ? bandColorOf(block, value) : undefined;
}

export function wellTooltipRows(
  block: VesselMapBlock,
  key: string,
  layers: readonly LineLayer[],
  calculation: BoardCalculation,
  sources: readonly SourceSummary[]
): WellTooltipRow[] {
  const rows: WellTooltipRow[] = [];
  const ratios: WellTooltipRow[] = [];
  for (const layer of layers) {
    const { line } = layer;
    const shown = wellLine(block, key, line, calculation);
    if (!shown) continue;
    const color = markColor(block, layer, key);
    if (isRatioAt(block, key, line, calculation)) {
      const count = cellCount(block, key, line, calculation);
      const partner = ratioPartner(block, key, line, calculation);
      rows.push({
        kind: 'line',
        color,
        name: shown.label,
        amount: count === undefined ? '' : formatNumber(count),
        unit: count === undefined ? '' : CELLS,
      });
      ratios.push({
        kind: 'ratio',
        ratio: shown.readable,
        between: partner
          ? `${shown.label || 'these cells'} : ${partnerName(block, key, partner)}`
          : 'pick the cells this ratio is to',
      });
    } else {
      rows.push({ kind: 'line', color, name: shown.label, ...splitAmount(shown.readable) });
    }
    const source = shown.label ? findNamed(sources, shown.label, found => found.name) : undefined;
    if (source) rows.push({ kind: 'detail', text: source.summary });
  }
  return [...ratios, ...rows];
}
