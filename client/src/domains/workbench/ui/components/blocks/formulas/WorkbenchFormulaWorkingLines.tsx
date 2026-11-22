import { formulaAnswerText, type FormulaResult } from '../../../../utils/formulas/boardCalculation';
import { withPerVessel } from '../../../../utils/terms/termLookup';

import { WorkbenchFormulaWorking } from './WorkbenchFormulaWorking';

export interface WorkingLine {
  id: string;
  name: string;
  result: FormulaResult | undefined;
  links?: Readonly<Record<string, string>>;
}

interface WorkbenchFormulaWorkingLinesProps {
  lines: readonly WorkingLine[];
  shortName: (name: string) => string;
  onShowBlock?: (blockId: string) => void;
}

const WORKING_ROW = 'border-t border-line-soft first:border-t-0';

export const lineAnswer = (line: WorkingLine): string =>
  line.result?.status === 'ok' ? withPerVessel(formulaAnswerText(line.result), line.name) : '';

export function WorkbenchFormulaWorkingLines({
  lines,
  shortName,
  onShowBlock,
}: WorkbenchFormulaWorkingLinesProps) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {lines.map(line => {
          const answer = lineAnswer(line);
          return (
            <tr key={line.id} className={WORKING_ROW}>
              <td className="whitespace-nowrap py-1.5 pr-4 align-middle text-label-xs text-muted-foreground">
                {shortName(line.name)}
              </td>
              <td className="w-full py-1.5 align-middle">
                <WorkbenchFormulaWorking
                  name={line.name}
                  result={line.result}
                  isCompact
                  shortName={shortName}
                  linkFor={name => {
                    const blockId = line.links?.[name];
                    return blockId && onShowBlock ? () => onShowBlock(blockId) : undefined;
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
  );
}
