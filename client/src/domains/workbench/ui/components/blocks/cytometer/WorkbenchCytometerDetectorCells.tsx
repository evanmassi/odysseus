import type { ReactNode } from 'react';

import { CYTOMETER_CELL, LIT_ROW_EDGE } from './cytometerTableStyles';

import type { DetectorSlot } from '../../../../utils/cytometer/cytometerPanel';

interface WorkbenchCytometerDetectorCellsProps {
  detector: DetectorSlot['detector'] | undefined;
  picker?: ReactNode;
  isLit?: boolean;
}

export function WorkbenchCytometerDetectorCells({
  detector,
  picker,
  isLit = false,
}: WorkbenchCytometerDetectorCellsProps) {
  return (
    <>
      <td className={isLit ? `${CYTOMETER_CELL} ${LIT_ROW_EDGE}` : CYTOMETER_CELL}>
        {picker ?? <span className="block font-semibold">{detector?.id}</span>}
        {detector?.usual && (
          <span className="block text-label-xs text-muted-foreground">{detector.usual}</span>
        )}
      </td>
      <td className={`${CYTOMETER_CELL} text-muted-foreground`}>{detector?.filter}</td>
    </>
  );
}
