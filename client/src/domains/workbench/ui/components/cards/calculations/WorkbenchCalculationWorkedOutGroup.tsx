import { memo } from 'react';

import { nameWithinOwner } from '../../../../utils/formulas/formulaScopes';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchCalculationSettingsButton } from './WorkbenchCalculationSettingsButton';
import { WorkbenchCalculationWorkedOutRow } from './WorkbenchCalculationWorkedOutRow';

import type { CardTarget } from '../../../../utils/cards/createCard';
import type { CalculationResult } from '../../../../utils/formulas/boardCalculation';

export interface WorkedOutLine {
  id: string;
  name: string;
  result: CalculationResult | undefined;
  warnings: readonly string[];
  isIntermediate: boolean;
}

export interface WorkedOutSettings {
  label: string;
  target: CardTarget;
}

interface WorkbenchCalculationWorkedOutGroupProps {
  title: string;
  lines: readonly WorkedOutLine[];
  subject: string;
  settings: WorkedOutSettings | undefined;
  onShow: (target: CardTarget) => void;
}

const isShown = (line: WorkedOutLine) => !line.isIntermediate || line.warnings.length > 0;

export const WorkbenchCalculationWorkedOutGroup = memo(function WorkbenchCalculationWorkedOutGroup({
  title,
  lines,
  subject,
  settings,
  onShow,
}: WorkbenchCalculationWorkedOutGroupProps) {
  const shortName = (name: string) => nameWithinOwner(name, subject);
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2 px-2 pb-0.5 pt-1">
        <span className={`${META_LABEL} min-w-0 flex-1 truncate`}>
          {capsKeepingGreek(shortName(title))}
        </span>
        {settings && <WorkbenchCalculationSettingsButton settings={settings} onShow={onShow} />}
      </div>
      {lines.filter(isShown).map(line => (
        <WorkbenchCalculationWorkedOutRow key={line.id} line={line} shortName={shortName} />
      ))}
    </div>
  );
});
