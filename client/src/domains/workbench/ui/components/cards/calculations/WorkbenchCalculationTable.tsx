import { memo } from 'react';

import { capsKeepingGreek } from '../../board/capsKeepingGreek';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchCalculationSectionHeader } from './WorkbenchCalculationSectionHeader';
import { WorkbenchCalculationSettingsButton } from './WorkbenchCalculationSettingsButton';
import { WorkbenchCalculationTableRow } from './WorkbenchCalculationTableRow';

import type { CalculationTableRowView } from './WorkbenchCalculationTableRow';
import type { WorkedOutSettings } from './WorkbenchCalculationWorkedOutGroup';
import type { CardTarget } from '../../../../utils/cards/createCard';
import type { PlateSwatchOf } from '../../../../utils/plateMap/plateSwatches';

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
            {rows.map((row, index) => (
              <WorkbenchCalculationTableRow
                key={row.key}
                row={row}
                columnCount={columns.length}
                isZebra={index % 2 === 1}
                swatch={swatchOf(row.subject)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
