import type { ReactNode } from 'react';

import {
  FLOW_CYTOMETRY_CELL,
  HOVER_ROW_EDGE,
  LIT_ROW_EDGE,
  MUTED_TEXT,
} from './flowCytometryTableStyles';

import type { DetectorSlot } from '../../../../utils/flowCytometry/flowCytometryPanel';

interface WorkbenchFlowCytometryDetectorCellsProps {
  detector: DetectorSlot['detector'] | undefined;
  picker?: ReactNode;
  isLit?: boolean;
}

export function WorkbenchFlowCytometryDetectorCells({
  detector,
  picker,
  isLit = false,
}: WorkbenchFlowCytometryDetectorCellsProps) {
  return (
    <>
      <td className={`${FLOW_CYTOMETRY_CELL} ${isLit ? LIT_ROW_EDGE : HOVER_ROW_EDGE}`}>
        {picker ?? <span className="block font-semibold">{detector?.id}</span>}
        {detector?.usual && (
          <span className={`block text-label-xs ${MUTED_TEXT}`}>{detector.usual}</span>
        )}
      </td>
      <td className={`${FLOW_CYTOMETRY_CELL} ${MUTED_TEXT}`}>{detector?.filter}</td>
    </>
  );
}
