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
  const { block, sheet, layers, board, sources, stains } = source;
  if (source.isStainSide) {
    return stainSideTooltipRows(block, sheet, key, layers, board, sources);
  }
  return [
    ...stainedElsewhereRows(block, sheet, key, stainId => stains.get(stainId)?.name),
    ...wellTooltipRows(block, key, layers, board, sources),
  ];
}

export function WorkbenchWellTooltip({ wellKey, heading }: WorkbenchWellTooltipProps) {
  const source = useContext(WellTooltipSourceContext);
  return wellTooltipTable({ heading, rows: source ? rowsFor(source, wellKey) : [] });
}
