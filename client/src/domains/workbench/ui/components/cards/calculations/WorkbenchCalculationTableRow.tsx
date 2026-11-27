import { memo, useState } from 'react';

import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { useFollowedNames } from '../../../../hooks/useFollowedNames';
import { calculationAnswerText, nameKey } from '../../../../utils/formulas/boardCalculation';
import { nameWithinOwner } from '../../../../utils/formulas/formulaScopes';
import { withPerLabwareKind } from '../../../../utils/terms/termLookup';
import { LEADER_LINE } from '../../board/leaderLineClass';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

import { WorkbenchCalculationWorkingChain } from './WorkbenchCalculationWorkingChain';

import type { WorkedOutLine } from './WorkbenchCalculationWorkedOutGroup';
import type { PlateSwatch } from '../../../../utils/plateMap/plateSwatches';

export interface CalculationTableRowView {
  key: string;
  label: string;
  subject: string;
  lines: readonly WorkedOutLine[];
}

interface WorkbenchCalculationTableRowProps {
  row: CalculationTableRowView;
  columnCount: number;
  isZebra: boolean;
  swatch: PlateSwatch | undefined;
}

const ANSWER_CELL = 'px-1 -mx-1 font-mono text-data-sm';
const ANSWER_LIT = 'bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary))]';
const ANSWER_IDLE = 'hover:shadow-[inset_0_0_0_1px_hsl(var(--line-strong))]';

const lineAnswer = (line: WorkedOutLine): string =>
  line.result?.status === 'ok'
    ? withPerLabwareKind(calculationAnswerText(line.result), line.name)
    : '';

export const WorkbenchCalculationTableRow = memo(function WorkbenchCalculationTableRow({
  row,
  columnCount,
  isZebra,
  swatch,
}: WorkbenchCalculationTableRowProps) {
  const [openId, setOpenId] = useState<string>();
  const { followed, toggleFollowed, clearFollowed } = useFollowedNames();
  const shortName = (name: string) => nameWithinOwner(name, row.subject);
  const warnings = row.lines.flatMap(line => line.warnings);
  const openLine = row.lines.find(line => line.id === openId);
  const zebra = isZebra ? 'bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : '';

  const answerButton = (line: WorkedOutLine) => {
    const isOpen = line.id === openId;
    const isLit = isOpen || (!!openLine && followed.has(nameKey(line.name)));
    return (
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={`${shortName(line.name)}: ${lineAnswer(line)}`}
        className={`${ANSWER_CELL} ${isLit ? ANSWER_LIT : ANSWER_IDLE}`}
        onClick={() => {
          clearFollowed();
          setOpenId(isOpen ? undefined : line.id);
        }}
      >
        {lineAnswer(line)}
      </button>
    );
  };

  return (
    <>
      <tr className={`${zebra} ${ROW_HOVER_GLOW.primary}`}>
        {row.lines.map((line, column) =>
          column ? (
            <td key={line.id} className="w-px whitespace-nowrap py-1 pl-3 pr-3 text-right">
              {answerButton(line)}
            </td>
          ) : (
            <td key={line.id} className="py-1 pl-2 pr-3">
              <span className="flex items-baseline gap-2">
                <span className="flex self-center">
                  <WorkbenchIndicatorSwatch swatch={swatch} />
                </span>
                <span className="text-body-sm">{row.label}</span>
                <span aria-hidden className={LEADER_LINE} />
                <span className="whitespace-nowrap">{answerButton(line)}</span>
              </span>
            </td>
          )
        )}
      </tr>
      {warnings.length > 0 && (
        <tr className={zebra}>
          <td colSpan={columnCount} className="px-2 pb-1 text-label-xs text-warning-text">
            {warnings.join(' · ')}
          </td>
        </tr>
      )}
      {openLine && (
        <tr className={zebra}>
          <td colSpan={columnCount} className="px-2 pb-2 pl-6">
            <WorkbenchCalculationWorkingChain
              name={openLine.name}
              result={openLine.result}
              shortName={shortName}
              followed={followed}
              onFollow={toggleFollowed}
            />
          </td>
        </tr>
      )}
    </>
  );
});
