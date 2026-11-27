import { memo, useState } from 'react';

import { Pencil } from 'lucide-react';

import { Tooltip } from '@shared/ui';
import { ROW_HOVER_GLOW, ROW_LIT_HOVER } from '@shared/ui/primitives/table/rowGlow';

import { useFollowedNames } from '../../../../hooks/useFollowedNames';
import { nameWithin } from '../../../../utils/formulas/formulaScopes';
import { LEADER_LINE } from '../../board/leaderLineClass';

import { CALCULATION_WORKING_INDENT } from './calculationLineClasses';
import { WorkbenchCalculationWorkingChain } from './WorkbenchCalculationWorkingChain';

import type { CalculationResult } from '../../../../utils/formulas/boardCalculation';
import type { MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchCalculationRowProps {
  calculationId: string;
  name: string;
  result: CalculationResult | undefined;
  material: MaterialItem | undefined;
  isOpen: boolean;
  onOpen: (calculationId: string) => void;
}

export const CALCULATION_ROW_ATTRIBUTE = 'data-calculation-row';

const answerOf = (result: CalculationResult | undefined) =>
  result?.status === 'ok' && 'text' in result.output ? result.output.text : '?';

export const WorkbenchCalculationRow = memo(function WorkbenchCalculationRow({
  calculationId,
  name,
  result,
  material,
  isOpen,
  onOpen,
}: WorkbenchCalculationRowProps) {
  const [isShowingWorking, setIsShowingWorking] = useState(false);
  const { followed, toggleFollowed, clearFollowed } = useFollowedNames();
  const shortName = nameWithin(name, material);
  const isWorkingShown = isShowingWorking || result?.status !== 'ok';
  return (
    <div
      {...{ [CALCULATION_ROW_ATTRIBUTE]: calculationId }}
      className={`row-tools-host px-2 py-1 even:bg-[hsl(var(--foreground)/var(--alpha-zebra))] ${isOpen ? ROW_LIT_HOVER : ROW_HOVER_GLOW.primary}`}
      onDoubleClick={() => onOpen(calculationId)}
    >
      <span className="flex w-full items-baseline">
        <button
          type="button"
          aria-expanded={isShowingWorking}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
          onClick={() => {
            clearFollowed();
            setIsShowingWorking(isShown => !isShown);
          }}
        >
          <span className="text-body-sm text-foreground">
            {shortName || <span className="text-muted-foreground">Unnamed</span>}
          </span>
          <span aria-hidden className={LEADER_LINE} />
          <span className="font-mono text-data-sm text-action">{answerOf(result)}</span>
        </button>
        <span className="row-tools">
          <span>
            <Tooltip content="Edit">
              <button
                type="button"
                aria-label={`Edit ${shortName || 'calculation'}`}
                className="pl-2 text-primary hover:text-foreground"
                onClick={() => onOpen(calculationId)}
              >
                <Pencil aria-hidden className="h-3 w-3" />
              </button>
            </Tooltip>
          </span>
        </span>
      </span>
      {isWorkingShown && (
        <div className={`${CALCULATION_WORKING_INDENT} empty:hidden`}>
          <WorkbenchCalculationWorkingChain
            name={name}
            result={result}
            shortName={full => nameWithin(full, material)}
            followed={followed}
            onFollow={toggleFollowed}
          />
        </div>
      )}
    </div>
  );
});
