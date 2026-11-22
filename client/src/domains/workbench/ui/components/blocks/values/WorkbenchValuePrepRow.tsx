import { Fragment, useState } from 'react';

import { nameWithinOwner } from '../../../../utils/formulas/formulaScopes';
import { WorkbenchFormulaWorkingLines } from '../formulas/WorkbenchFormulaWorkingLines';

import type { CellPrep } from '../../../../utils/materials/cellPrep';

interface WorkbenchValuePrepRowProps {
  prep: CellPrep;
  span: number;
  isZebra: boolean;
}

const SEPARATOR = <span className="mx-1.5 text-muted-foreground">·</span>;

export function WorkbenchValuePrepRow({ prep, span, isZebra }: WorkbenchValuePrepRowProps) {
  const [isShowingWorking, setIsShowingWorking] = useState(false);
  const parts = [
    ...prep.steps.map(step => <span key={step}>{step}</span>),
    ...prep.warnings.map(warning => (
      <span key={warning} className="text-warning-text">
        {warning}
      </span>
    )),
  ];

  return (
    <tr className={isZebra ? 'bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : ''}>
      <td colSpan={span} className="pb-2 pl-10 pr-3 text-body-sm">
        <span className="mr-2 font-semibold text-success-text">Prep</span>
        {parts.map((part, index) => (
          <Fragment key={part.key}>
            {index > 0 && SEPARATOR}
            {part}
          </Fragment>
        ))}
        {prep.lines.length > 0 && (
          <button
            type="button"
            aria-expanded={isShowingWorking}
            className="ml-3 text-label-xs text-primary hover:underline"
            onClick={() => setIsShowingWorking(isShown => !isShown)}
          >
            {isShowingWorking ? 'Hide working' : 'Show working'}
          </button>
        )}
        {isShowingWorking && (
          <div className="mt-1 max-w-3xl pl-4">
            <WorkbenchFormulaWorkingLines
              lines={prep.lines}
              shortName={name => nameWithinOwner(name, prep.subject)}
            />
          </div>
        )}
      </td>
    </tr>
  );
}
