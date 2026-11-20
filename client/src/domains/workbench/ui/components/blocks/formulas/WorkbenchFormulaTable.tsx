import { Fragment, memo, useState } from 'react';

import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { formulaAnswerText } from '../../../../utils/formulas/boardCalculation';
import { nameWithinOwner } from '../../../../utils/formulas/formulaScopes';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';
import { LEADER_LINE } from '../../board/leaderLineClass';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchFormulaSectionHeader } from './WorkbenchFormulaSectionHeader';
import { WorkbenchFormulaSettingsButton } from './WorkbenchFormulaSettingsButton';
import { WorkbenchFormulaWorking } from './WorkbenchFormulaWorking';

import type { WorkedOutLine, WorkedOutSettings } from './WorkbenchFormulaWorkedOutGroup';

export interface FormulaTableRow {
  key: string;
  label: string;
  subject: string;
  lines: readonly WorkedOutLine[];
}

interface WorkbenchFormulaTableProps {
  title: string;
  columns: readonly string[];
  rows: readonly FormulaTableRow[];
  settings: WorkedOutSettings | undefined;
  onShowBlock: (blockId: string) => void;
}

const answerOf = (line: WorkedOutLine) =>
  line.result?.status === 'ok' ? formulaAnswerText(line.result) : '';

const HEAD_CELL = `${META_LABEL} px-2 pb-1 align-bottom font-normal`;
const WORKING_ROW = 'border-t border-line-soft first:border-t-0';

export const WorkbenchFormulaTable = memo(function WorkbenchFormulaTable({
  title,
  columns,
  rows,
  settings,
  onShowBlock,
}: WorkbenchFormulaTableProps) {
  const [openKey, setOpenKey] = useState<string>();

  return (
    <section className="min-w-0 break-inside-avoid">
      <WorkbenchFormulaSectionHeader title={title}>
        {settings && (
          <WorkbenchFormulaSettingsButton settings={settings} onShowBlock={onShowBlock} />
        )}
      </WorkbenchFormulaSectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={`${HEAD_CELL} whitespace-nowrap pr-3 text-right ${index ? 'w-px pl-3' : 'pl-2'}`}
                >
                  {capsKeepingGreek(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isOpen = openKey === row.key;
              const shortName = (name: string) => nameWithinOwner(name, row.subject);
              const warnings = row.lines.flatMap(line => line.warnings);
              const zebra = index % 2 ? 'bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : '';
              return (
                <Fragment key={row.key}>
                  <tr
                    className={`${zebra} ${ROW_HOVER_GLOW.primary} cursor-pointer`}
                    onClick={() => setOpenKey(isOpen ? undefined : row.key)}
                  >
                    {row.lines.map((line, column) =>
                      column ? (
                        <td
                          key={line.id}
                          className="w-px whitespace-nowrap py-1 pl-3 pr-3 text-right font-mono text-data-sm"
                        >
                          {answerOf(line)}
                        </td>
                      ) : (
                        <td key={line.id} className="py-1 pl-2 pr-3">
                          <span className="flex items-baseline gap-2">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              className="text-left text-body-sm"
                              onClick={event => {
                                event.stopPropagation();
                                setOpenKey(isOpen ? undefined : row.key);
                              }}
                            >
                              {row.label}
                            </button>
                            <span aria-hidden className={LEADER_LINE} />
                            <span className="whitespace-nowrap font-mono text-data-sm">
                              {answerOf(line)}
                            </span>
                          </span>
                        </td>
                      )
                    )}
                  </tr>
                  {warnings.length > 0 && (
                    <tr className={zebra}>
                      <td
                        colSpan={columns.length}
                        className="px-2 pb-1 text-label-xs text-warning-text"
                      >
                        {warnings.join(' · ')}
                      </td>
                    </tr>
                  )}
                  {isOpen && (
                    <tr className={zebra}>
                      <td colSpan={columns.length} className="px-2 pb-2 pl-6">
                        <table className="w-full border-collapse">
                          <tbody>
                            {row.lines.map(line => {
                              const answer = answerOf(line);
                              return (
                                <tr key={line.id} className={WORKING_ROW}>
                                  <td className="whitespace-nowrap py-1.5 pr-4 align-middle text-label-xs text-muted-foreground">
                                    {shortName(line.name)}
                                  </td>
                                  <td className="w-full py-1.5 align-middle">
                                    <WorkbenchFormulaWorking
                                      result={line.result}
                                      isCompact
                                      shortName={shortName}
                                      linkFor={name => {
                                        const blockId = line.links[name];
                                        return blockId ? () => onShowBlock(blockId) : undefined;
                                      }}
                                    />
                                  </td>
                                  <td className="whitespace-nowrap py-1.5 pl-4 text-right align-middle font-mono text-data-sm text-action">
                                    {answer && `= ${answer}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
});
