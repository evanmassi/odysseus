import { useState } from 'react';

import { Button } from '@shared/ui';

import { formulaAnswerText, type FormulaResult } from '../../../../utils/formulas/boardCalculation';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchFormulaWorking } from './WorkbenchFormulaWorking';

export interface WorkedOutLine {
  id: string;
  name: string;
  result: FormulaResult | undefined;
  warnings: readonly string[];
  isIntermediate: boolean;
}

interface WorkbenchFormulaWorkedOutGroupProps {
  title: string;
  lines: readonly WorkedOutLine[];
  settingsLabel: string | undefined;
  shortName: (name: string) => string;
  linkFor: (name: string) => (() => void) | undefined;
  onShowSettings: () => void;
}

const LINE_HEAD = 'flex w-full items-baseline gap-2 text-left';
const LEADER = 'flex-1 border-b border-dashed border-line-soft';

export function WorkbenchFormulaWorkedOutGroup({
  title,
  lines,
  settingsLabel,
  shortName,
  linkFor,
  onShowSettings,
}: WorkbenchFormulaWorkedOutGroupProps) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const [isShowingWorking, setIsShowingWorking] = useState(false);

  const toggle = (id: string) =>
    setOpenIds(ids => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const messages = new Set(
    lines.map(line => (line.result?.status === 'ok' ? undefined : line.result?.message))
  );
  const [sharedProblem] = messages.size === 1 ? [...messages] : [];
  const checkedLines = lines.map(line => ({
    ...line,
    warnings: line.warnings.filter(
      warning => line.result?.status === 'ok' || warning !== line.result?.message
    ),
  }));
  const isTucked = (line: WorkedOutLine) =>
    line.isIntermediate && line.result?.status === 'ok' && !line.warnings.length;
  const tuckedCount = checkedLines.filter(isTucked).length;
  const visibleLines = isShowingWorking
    ? checkedLines
    : checkedLines.filter(line => !isTucked(line));

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2 px-2 pb-0.5 pt-1">
        <span className={`${META_LABEL} min-w-0 truncate`}>{title}</span>
        {settingsLabel && (
          <Button variant="ghost-primary" size="xs" className="ml-auto" onClick={onShowSettings}>
            Set in {settingsLabel}
          </Button>
        )}
      </div>
      {sharedProblem && (
        <p className="px-2 py-1 text-label-xs text-muted-foreground">{sharedProblem}</p>
      )}
      {!sharedProblem &&
        visibleLines.map(line => {
          const { result, warnings } = line;
          const label = (
            <span className="text-body-sm text-foreground">{shortName(line.name)}</span>
          );
          return (
            <div key={line.id} className="px-2 py-1 even:bg-foreground/[0.025]">
              {result?.status === 'ok' ? (
                <button
                  type="button"
                  aria-expanded={openIds.has(line.id)}
                  className={`${LINE_HEAD} hover:text-action`}
                  onClick={() => toggle(line.id)}
                >
                  {label}
                  <span aria-hidden className={LEADER} />
                  <span className="font-mono text-data-sm text-foreground">
                    {formulaAnswerText(result)}
                  </span>
                </button>
              ) : (
                <div className={LINE_HEAD}>
                  {label}
                  <span aria-hidden className={LEADER} />
                  <span className="max-w-[60%] text-right text-label-xs text-muted-foreground">
                    {result?.message}
                  </span>
                </div>
              )}
              {warnings.map(warning => (
                <p key={warning} className="text-label-xs text-warning-text">
                  {warning}
                </p>
              ))}
              {openIds.has(line.id) && (
                <div className="pl-3 pt-1">
                  <WorkbenchFormulaWorking
                    result={result}
                    isCompact
                    shortName={shortName}
                    linkFor={linkFor}
                  />
                </div>
              )}
            </div>
          );
        })}
      {!sharedProblem && tuckedCount > 0 && (
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
}
