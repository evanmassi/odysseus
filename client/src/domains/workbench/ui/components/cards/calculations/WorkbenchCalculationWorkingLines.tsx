import {
  calculationAnswerText,
  type CalculationResult,
} from '../../../../utils/formulas/boardCalculation';
import { withPerLabwareKind } from '../../../../utils/terms/termLookup';

import { WorkbenchCalculationWorking } from './WorkbenchCalculationWorking';

export interface WorkingLine {
  id: string;
  name: string;
  result: CalculationResult | undefined;
  links?: Readonly<Record<string, string>>;
}

interface WorkbenchCalculationWorkingLinesProps {
  lines: readonly WorkingLine[];
  shortName: (name: string) => string;
  onShowCard?: (cardId: string) => void;
}

const WORKING_ROW = 'border-t border-line-soft first:border-t-0';

export const lineAnswer = (line: WorkingLine): string =>
  line.result?.status === 'ok'
    ? withPerLabwareKind(calculationAnswerText(line.result), line.name)
    : '';

export function WorkbenchCalculationWorkingLines({
  lines,
  shortName,
  onShowCard,
}: WorkbenchCalculationWorkingLinesProps) {
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
                <WorkbenchCalculationWorking
                  name={line.name}
                  result={line.result}
                  isCompact
                  shortName={shortName}
                  linkFor={name => {
                    const cardId = line.links?.[name];
                    return cardId && onShowCard ? () => onShowCard(cardId) : undefined;
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
