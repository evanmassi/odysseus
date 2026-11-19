import { useContext } from 'react';

import { wellTooltipRows } from '../../../../utils/vessels/wellTooltip';

import { WellTooltipSourceContext } from './wellTooltipSource';
import { wellTooltipTable } from './wellTooltipTable';

interface WorkbenchWellTooltipProps {
  wellKey: string;
  heading: string;
}

export function WorkbenchWellTooltip({ wellKey, heading }: WorkbenchWellTooltipProps) {
  const source = useContext(WellTooltipSourceContext);
  const rows = source
    ? wellTooltipRows(source.block, wellKey, source.layers, source.calculation, source.sources)
    : [];
  return wellTooltipTable({ heading, rows });
}
