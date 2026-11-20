import { useContext } from 'react';

import {
  stainedElsewhereRows,
  stainSideTooltipRows,
  wellTooltipRows,
  type WellTooltipRow,
} from '../../../../utils/vessels/wellTooltip';

import { WellTooltipSourceContext, type WellTooltipSource } from './wellTooltipSource';
import { wellTooltipTable } from './wellTooltipTable';

interface WorkbenchWellTooltipProps {
  wellKey: string;
  heading: string;
}

function rowsFor(source: WellTooltipSource, key: string): WellTooltipRow[] {
  const { block, sheet, layers, calculation, sources, mixes } = source;
  if (source.isStainSide) {
    return stainSideTooltipRows(block, sheet, key, layers, calculation, sources);
  }
  return [
    ...stainedElsewhereRows(block, sheet, key, mixId => mixes.get(mixId)?.name),
    ...wellTooltipRows(block, key, layers, calculation, sources),
  ];
}

export function WorkbenchWellTooltip({ wellKey, heading }: WorkbenchWellTooltipProps) {
  const source = useContext(WellTooltipSourceContext);
  return wellTooltipTable({ heading, rows: source ? rowsFor(source, wellKey) : [] });
}
