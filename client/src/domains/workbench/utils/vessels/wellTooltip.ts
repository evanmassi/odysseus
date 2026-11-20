import { bandColorOf, lineValueOf, type VesselMapBlock } from '@odysseus/shared-schemas';

import { formatNumber } from '../formulas/quantities';
import { findNamed } from '../materials/materialLookup';

import { cellCount, isRatioAt, partnerName, ratioPartner } from './cellRatios';
import { markKindOf } from './plateLayers';
import { isAtHome, stainOccupants } from './stainLayout';
import { wellLine } from './wellContents';

import type { BandKind, LineLayer } from './plateLayers';
import type { VesselSheet } from './vesselTabs';
import type { BoardCalculation } from '../formulas/boardCalculation';
import type { SourceSummary } from '../materials/materialSources';

export type WellTooltipRow =
  | {
      kind: 'line';
      mark: WellMark | undefined;
      name: string;
      amount: string;
      unit: string;
    }
  | { kind: 'detail'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'ratio'; ratio: string; between: string };

export interface WellMark {
  kind: BandKind;
  color: string;
}

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

function markOf(block: VesselMapBlock, layer: LineLayer, key: string): WellMark | undefined {
  const value = lineValueOf(layer.line, block.cells[key]?.[layer.line.id]);
  const kind = markKindOf(layer.role);
  if (!value || !kind) return undefined;
  const color = kind === 'fill' ? value.color : bandColorOf(block, value);
  return color ? { kind, color } : undefined;
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
    const mark = markOf(block, layer, key);
    if (isRatioAt(block, key, line, calculation)) {
      const count = cellCount(block, key, line, calculation);
      const partner = ratioPartner(block, key, line, calculation);
      rows.push({
        kind: 'line',
        mark,
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
      rows.push({ kind: 'line', mark, name: shown.label, ...splitAmount(shown.readable) });
    }
    const source = shown.label ? findNamed(sources, shown.label, found => found.name) : undefined;
    if (source) rows.push({ kind: 'detail', text: source.summary });
  }
  return [...ratios, ...rows];
}

const labelIn = (sheet: VesselSheet, key: string) =>
  sheet.spots.find(spot => spot.key === key)?.label ?? key;

export function stainSideTooltipRows(
  block: VesselMapBlock,
  sheet: VesselSheet,
  key: string,
  layers: readonly LineLayer[],
  calculation: BoardCalculation,
  sources: readonly SourceSummary[]
): WellTooltipRow[] {
  const occupants = stainOccupants(block, sheet);
  const contentsOf = (well: string) => wellTooltipRows(block, well, layers, calculation, sources);
  if (isAtHome(occupants, key)) return contentsOf(key);
  const wells = occupants.get(key) ?? [];
  if (!wells.length) return [];
  const contents = wells.map(contentsOf);
  const isAlike = contents.every(rows => JSON.stringify(rows) === JSON.stringify(contents[0]));
  const cameFrom: WellTooltipRow = {
    kind: 'note',
    text: `Came from ${wells.map(well => labelIn(sheet, well)).join(', ')}`,
  };
  if (isAlike) return [cameFrom, ...contents[0]];
  return [
    cameFrom,
    ...wells.flatMap((well, index): WellTooltipRow[] => [
      { kind: 'note', text: labelIn(sheet, well) },
      ...contents[index],
    ]),
  ];
}

export function stainedElsewhereRows(
  block: VesselMapBlock,
  sheet: VesselSheet,
  key: string,
  mixNameOf: (mixId: string) => string | undefined
): WellTooltipRow[] {
  const spot = block.stainedIn[key];
  if (!spot) return [];
  const isPooled = (stainOccupants(block, sheet).get(spot)?.length ?? 0) > 1;
  const mixId = block.stain[spot];
  const label = labelIn(sheet, spot);
  const mixName = mixId === undefined ? undefined : mixNameOf(mixId);
  const text = mixName
    ? `Stained ${isPooled ? 'pooled ' : ''}in ${label} · ${mixName}`
    : `${isPooled ? 'Pooled in' : 'Moved to'} ${label} for staining`;
  return [{ kind: 'note', text }];
}
