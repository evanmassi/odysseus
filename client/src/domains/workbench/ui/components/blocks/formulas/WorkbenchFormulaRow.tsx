import { memo, useState } from 'react';

import { Pencil } from 'lucide-react';

import { Tooltip } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { nameWithin } from '../../../../utils/formulas/formulaScopes';

import { FORMULA_LEADER, FORMULA_WORKING_INDENT } from './formulaLineClasses';
import { WorkbenchFormulaWorking } from './WorkbenchFormulaWorking';

import type { FormulaResult } from '../../../../utils/formulas/boardCalculation';
import type { MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchFormulaRowProps {
  formulaId: string;
  name: string;
  result: FormulaResult | undefined;
  material: MaterialItem | undefined;
  onOpen: (formulaId: string) => void;
}

const answerOf = (result: FormulaResult | undefined) =>
  result?.status === 'ok' && 'text' in result.output ? result.output.text : '?';

export const WorkbenchFormulaRow = memo(function WorkbenchFormulaRow({
  formulaId,
  name,
  result,
  material,
  onOpen,
}: WorkbenchFormulaRowProps) {
  const [isShowingWorking, setIsShowingWorking] = useState(false);
  const shortName = nameWithin(name, material);
  const isWorkingShown = isShowingWorking || result?.status !== 'ok';
  return (
    <div
      className={`row-tools-host px-2 py-1 even:bg-[hsl(var(--foreground)/var(--alpha-zebra))] ${ROW_HOVER_GLOW.primary}`}
      onDoubleClick={() => onOpen(formulaId)}
    >
      <span className="flex w-full items-baseline">
        <button
          type="button"
          aria-expanded={isShowingWorking}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
          onClick={() => setIsShowingWorking(isShown => !isShown)}
        >
          <span className="text-body-sm text-foreground">
            {shortName || <span className="text-muted-foreground">Unnamed</span>}
          </span>
          <span aria-hidden className={FORMULA_LEADER} />
          <span className="font-mono text-data-sm text-action">{answerOf(result)}</span>
        </button>
        <span className="row-tools">
          <span>
            <Tooltip content="Edit">
              <button
                type="button"
                aria-label={`Edit ${shortName || 'calculation'}`}
                className="pl-2 text-primary hover:text-foreground"
                onClick={() => onOpen(formulaId)}
              >
                <Pencil aria-hidden className="h-3 w-3" />
              </button>
            </Tooltip>
          </span>
        </span>
      </span>
      {isWorkingShown && (
        <div className={`${FORMULA_WORKING_INDENT} empty:hidden`}>
          <WorkbenchFormulaWorking
            result={result}
            isCompact
            shortName={full => nameWithin(full, material)}
          />
        </div>
      )}
    </div>
  );
});
