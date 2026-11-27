import { useState } from 'react';

import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { useFollowedNames } from '../../../../hooks/useFollowedNames';
import { calculationAnswerText } from '../../../../utils/formulas/boardCalculation';
import { LEADER_LINE } from '../../board/leaderLineClass';

import { CALCULATION_WORKING_INDENT } from './calculationLineClasses';
import { WorkbenchCalculationWorkingChain } from './WorkbenchCalculationWorkingChain';

import type { WorkedOutLine } from './WorkbenchCalculationWorkedOutGroup';

interface WorkbenchCalculationWorkedOutRowProps {
  line: WorkedOutLine;
  shortName: (name: string) => string;
}

export function WorkbenchCalculationWorkedOutRow({
  line,
  shortName,
}: WorkbenchCalculationWorkedOutRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { followed, toggleFollowed, clearFollowed } = useFollowedNames();
  const { result, warnings } = line;
  return (
    <div
      className={`px-2 py-1 even:bg-[hsl(var(--foreground)/var(--alpha-zebra))] ${ROW_HOVER_GLOW.primary}`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex w-full items-baseline gap-2 text-left"
        onClick={() => {
          clearFollowed();
          setIsOpen(open => !open);
        }}
      >
        <span className="text-body-sm text-foreground">{shortName(line.name)}</span>
        <span aria-hidden className={LEADER_LINE} />
        <span className="font-mono text-data-sm text-foreground">
          {result?.status === 'ok' && calculationAnswerText(result)}
        </span>
      </button>
      {warnings.map(warning => (
        <p key={warning} className="text-label-xs text-warning-text">
          {warning}
        </p>
      ))}
      {isOpen && (
        <div className={`${CALCULATION_WORKING_INDENT} pt-1`}>
          <WorkbenchCalculationWorkingChain
            name={line.name}
            result={result}
            shortName={shortName}
            followed={followed}
            onFollow={toggleFollowed}
          />
        </div>
      )}
    </div>
  );
}
