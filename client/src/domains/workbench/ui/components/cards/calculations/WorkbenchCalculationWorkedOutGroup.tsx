import { memo, useState } from 'react';

import { Button } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import {
  calculationAnswerText,
  type CalculationResult,
} from '../../../../utils/formulas/boardCalculation';
import { nameWithinOwner } from '../../../../utils/formulas/formulaScopes';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';
import { LEADER_LINE } from '../../board/leaderLineClass';
import { META_LABEL } from '../../board/metaLabelClass';

import { CALCULATION_WORKING_INDENT } from './calculationLineClasses';
import { WorkbenchCalculationSettingsButton } from './WorkbenchCalculationSettingsButton';
import { WorkbenchCalculationWorking } from './WorkbenchCalculationWorking';

export interface WorkedOutLine {
  id: string;
  name: string;
  result: CalculationResult | undefined;
  links: Readonly<Record<string, string>>;
  warnings: readonly string[];
  isIntermediate: boolean;
}

export interface WorkedOutSettings {
  label: string;
  cardId: string;
}

interface WorkbenchCalculationWorkedOutGroupProps {
  title: string;
  lines: readonly WorkedOutLine[];
  subject: string;
  settings: WorkedOutSettings | undefined;
  onShowCard: (cardId: string) => void;
}

export const WorkbenchCalculationWorkedOutGroup = memo(function WorkbenchCalculationWorkedOutGroup({
  title,
  lines,
  subject,
  settings,
  onShowCard,
}: WorkbenchCalculationWorkedOutGroupProps) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const [isShowingWorking, setIsShowingWorking] = useState(false);

  const shortName = (name: string) => nameWithinOwner(name, subject);
  const toggle = (id: string) =>
    setOpenIds(ids => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const isTucked = (line: WorkedOutLine) => line.isIntermediate && !line.warnings.length;
  const tuckedCount = lines.filter(isTucked).length;
  const visibleLines = isShowingWorking ? lines : lines.filter(line => !isTucked(line));

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2 px-2 pb-0.5 pt-1">
        <span className={`${META_LABEL} min-w-0 flex-1 truncate`}>
          {capsKeepingGreek(shortName(title))}
        </span>
        {settings && (
          <WorkbenchCalculationSettingsButton settings={settings} onShowCard={onShowCard} />
        )}
      </div>
      {visibleLines.map(line => {
        const { result, links, warnings } = line;
        return (
          <div
            key={line.id}
            className={`px-2 py-1 even:bg-[hsl(var(--foreground)/var(--alpha-zebra))] ${ROW_HOVER_GLOW.primary}`}
          >
            <button
              type="button"
              aria-expanded={openIds.has(line.id)}
              className="flex w-full items-baseline gap-2 text-left"
              onClick={() => toggle(line.id)}
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
            {openIds.has(line.id) && (
              <div className={`${CALCULATION_WORKING_INDENT} pt-1`}>
                <WorkbenchCalculationWorking
                  name={line.name}
                  result={result}
                  isCompact
                  shortName={shortName}
                  linkFor={name => {
                    const cardId = links[name];
                    return cardId ? () => onShowCard(cardId) : undefined;
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
      {tuckedCount > 0 && (
        <Button
          variant="ghost-primary"
          size="xs"
          className="mx-1 self-start"
          aria-expanded={isShowingWorking}
          onClick={() => setIsShowingWorking(isShown => !isShown)}
        >
          {isShowingWorking ? 'Hide working' : `Show working (${tuckedCount})`}
        </Button>
      )}
    </div>
  );
});
