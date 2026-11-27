import { useContext } from 'react';

import {
  stainedElsewhereRows,
  stainSideTooltipRows,
  wellTooltipRows,
  type WellTooltipRow,
} from '../../../../utils/plateMap/wellTooltip';

import { WellTooltipSourceContext, type WellTooltipSource } from './wellTooltipSource';
import { wellTooltipTable } from './wellTooltipTable';

interface WorkbenchWellTooltipProps {
  wellKey: string;
  heading: string;
}

function rowsFor(source: WellTooltipSource, key: string): WellTooltipRow[] {
  const { card, seriesById, sheet, layers, board, donorSummaries, stains } = source;
  if (source.isStainSide) {
    return stainSideTooltipRows(card, seriesById, sheet, key, layers, board, donorSummaries);
  }
  return [
    ...stainedElsewhereRows(card, sheet, key, stainId => stains.get(stainId)?.name),
    ...wellTooltipRows(card, seriesById, key, layers, board, donorSummaries),
  ];
}

export function WorkbenchWellTooltip({ wellKey, heading }: WorkbenchWellTooltipProps) {
  const source = useContext(WellTooltipSourceContext);
  return wellTooltipTable({ heading, rows: source ? rowsFor(source, wellKey) : [] });
}
