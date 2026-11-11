import { memo } from 'react';

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
  const shortName = nameWithin(name, material);
  return (
    <button
      type="button"
      onClick={() => onOpen(formulaId)}
      className={`flex w-full flex-col gap-1 px-2 py-1.5 text-left even:bg-[hsl(var(--foreground)/var(--alpha-zebra))] ${ROW_HOVER_GLOW.primary}`}
    >
      <span className="flex w-full items-baseline gap-2">
        <span className="text-body-sm text-foreground">
          {shortName || <span className="text-muted-foreground">Unnamed</span>}
        </span>
        <span aria-hidden className={FORMULA_LEADER} />
        <span className="font-mono text-data-sm text-action">{answerOf(result)}</span>
      </span>
      <span className={`${FORMULA_WORKING_INDENT} block empty:hidden`}>
        <WorkbenchFormulaWorking
          result={result}
          isCompact
          shortName={full => nameWithin(full, material)}
        />
      </span>
    </button>
  );
});
