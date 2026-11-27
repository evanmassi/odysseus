import { Fragment, memo, useState } from 'react';

import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { nameWithinOwner } from '../../../../utils/formulas/formulaScopes';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';
import { LEADER_LINE } from '../../board/leaderLineClass';
import { META_LABEL } from '../../board/metaLabelClass';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

import { WorkbenchCalculationSectionHeader } from './WorkbenchCalculationSectionHeader';
import { WorkbenchCalculationSettingsButton } from './WorkbenchCalculationSettingsButton';
import { lineAnswer, WorkbenchCalculationWorkingLines } from './WorkbenchCalculationWorkingLines';

import type { WorkedOutLine, WorkedOutSettings } from './WorkbenchCalculationWorkedOutGroup';
import type { CardTarget } from '../../../../utils/cards/createCard';
import type { PlateSwatchOf } from '../../../../utils/plateMap/plateSwatches';

export interface CalculationTableRowView {
  key: string;
  label: string;
  subject: string;
  lines: readonly WorkedOutLine[];
}

interface WorkbenchCalculationTableProps {
  title: string;
  columns: readonly string[];
  rows: readonly CalculationTableRowView[];
  settings: WorkedOutSettings | undefined;
  swatchOf: PlateSwatchOf;
  onShow: (target: CardTarget) => void;
}

const HEAD_CELL = `${META_LABEL} px-2 pb-1 align-bottom font-normal`;

export const WorkbenchCalculationTable = memo(function WorkbenchCalculationTable({
  title,
  columns,
  rows,
  settings,
  swatchOf,
  onShow,
}: WorkbenchCalculationTableProps) {
  const [openKey, setOpenKey] = useState<string>();

  return (
    <section className="min-w-0 break-inside-avoid">
      <WorkbenchCalculationSectionHeader title={title}>
        {settings && <WorkbenchCalculationSettingsButton settings={settings} onShow={onShow} />}
      </WorkbenchCalculationSectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={`${HEAD_CELL} whitespace-nowrap pr-3 ${index ? 'w-px pl-3 text-right' : 'pl-2 text-left'}`}
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
                          {lineAnswer(line)}
                        </td>
                      ) : (
                        <td key={line.id} className="py-1 pl-2 pr-3">
                          <span className="flex items-baseline gap-2">
                            <span className="flex self-center">
                              <WorkbenchIndicatorSwatch swatch={swatchOf(row.subject)} />
                            </span>
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
                              {lineAnswer(line)}
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
                        <WorkbenchCalculationWorkingLines lines={row.lines} shortName={shortName} />
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
