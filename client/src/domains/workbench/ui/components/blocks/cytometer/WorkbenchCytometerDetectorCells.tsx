import type { ReactNode } from 'react';

import { CYTOMETER_CELL, HOVER_ROW_EDGE, LIT_ROW_EDGE, MUTED_TEXT } from './cytometerTableStyles';

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
      <td className={`${CYTOMETER_CELL} ${isLit ? LIT_ROW_EDGE : HOVER_ROW_EDGE}`}>
        {picker ?? <span className="block font-semibold">{detector?.id}</span>}
        {detector?.usual && (
          <span className={`block text-label-xs ${MUTED_TEXT}`}>{detector.usual}</span>
        )}
      </td>
      <td className={`${CYTOMETER_CELL} ${MUTED_TEXT}`}>{detector?.filter}</td>
    </>
  );
}
