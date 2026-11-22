import { indicatorColorOf, lineValueOf, type PlateMapCard } from '@odysseus/shared-schemas';

import { formatNumber } from '../formulas/quantities';
import { findNamed } from '../materials/materialLookup';

import { cellCount, isRatioAt, partnerName, ratioPartner } from './cellRatios';
import { indicatorKindOf } from './plateLayers';
import { isAtHome, stainSamples } from './stainLayout';
import { wellLine } from './wellContents';

import type { IndicatorKind, LineLayer } from './plateLayers';
import type { PlateMapSheet } from './plateMapTabs';
import type { SolvedBoard } from '../formulas/boardCalculation';
import type { DonorSummary } from '../materials/materialDonors';

export type WellTooltipRow =
  | {
      kind: 'line';
      indicator: WellIndicator | undefined;
      name: string;
      amount: string;
      unit: string;
    }
  | { kind: 'detail'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'ratio'; ratio: string; between: string };

export interface WellIndicator {
  kind: IndicatorKind;
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

function indicatorOf(card: PlateMapCard, layer: LineLayer, key: string): WellIndicator | undefined {
  const value = lineValueOf(layer.line, card.samples[key]?.[layer.line.id]);
  const kind = indicatorKindOf(layer.role);
  if (!value || !kind) return undefined;
  const color = kind === 'fill' ? value.color : indicatorColorOf(card, value);
  return color ? { kind, color } : undefined;
}

export function wellTooltipRows(
  card: PlateMapCard,
  key: string,
  layers: readonly LineLayer[],
  board: SolvedBoard,
  donorSummaries: readonly DonorSummary[]
): WellTooltipRow[] {
  const rows: WellTooltipRow[] = [];
  const ratios: WellTooltipRow[] = [];
  for (const layer of layers) {
    const { line } = layer;
    const shown = wellLine(card, key, line, board);
    if (!shown) continue;
    const indicator = indicatorOf(card, layer, key);
    if (isRatioAt(card, key, line, board)) {
      const count = cellCount(card, key, line, board);
      const partner = ratioPartner(card, key, line, board);
      rows.push({
        kind: 'line',
        indicator,
        name: shown.label,
        amount: count === undefined ? '' : formatNumber(count),
        unit: count === undefined ? '' : CELLS,
      });
      ratios.push({
        kind: 'ratio',
        ratio: shown.readable,
        between: partner
          ? `${shown.label || 'these cells'} : ${partnerName(card, key, partner)}`
          : 'pick the cells this ratio is to',
      });
    } else {
      rows.push({ kind: 'line', indicator, name: shown.label, ...splitAmount(shown.readable) });
    }
    const source = shown.label
      ? findNamed(donorSummaries, shown.label, found => found.name)
      : undefined;
    if (source) rows.push({ kind: 'detail', text: source.summary });
  }
  return [...ratios, ...rows];
}

const labelIn = (sheet: PlateMapSheet, key: string) =>
  sheet.positions.find(position => position.key === key)?.label ?? key;

export function stainSideTooltipRows(
  card: PlateMapCard,
  sheet: PlateMapSheet,
  key: string,
  layers: readonly LineLayer[],
  board: SolvedBoard,
  donorSummaries: readonly DonorSummary[]
): WellTooltipRow[] {
  const samples = stainSamples(card, sheet);
  const contentsOf = (well: string) => wellTooltipRows(card, well, layers, board, donorSummaries);
  if (isAtHome(samples, key)) return contentsOf(key);
  const wells = samples.get(key) ?? [];
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
  card: PlateMapCard,
  sheet: PlateMapSheet,
  key: string,
  stainNameOf: (stainId: string) => string | undefined
): WellTooltipRow[] {
  const position = card.stainedIn[key];
  if (!position) return [];
  const isPooled = (stainSamples(card, sheet).get(position)?.length ?? 0) > 1;
  const stainId = card.stain[position];
  const label = labelIn(sheet, position);
  const stainName = stainId === undefined ? undefined : stainNameOf(stainId);
  const text = stainName
    ? `Stained ${isPooled ? 'pooled ' : ''}in ${label} · ${stainName}`
    : `${isPooled ? 'Pooled in' : 'Moved to'} ${label} for staining`;
  return [{ kind: 'note', text }];
}
