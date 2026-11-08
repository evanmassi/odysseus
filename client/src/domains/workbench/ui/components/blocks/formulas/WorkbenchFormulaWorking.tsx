import {
  formulaAnswerText,
  type FormulaResult,
  type WorkingTerm,
} from '../../../../utils/formulas/boardCalculation';
import { describeDimension } from '../../../../utils/formulas/quantities';

interface WorkbenchFormulaWorkingProps {
  result: FormulaResult | undefined;
  isCompact: boolean;
  shortName: (name: string) => string;
  onAddMissing?: (name: string) => void;
}

const TERM_SOURCE_CLASS: Record<Extract<WorkingTerm, { kind: 'ref' }>['source'], string> = {
  value: 'text-foreground',
  count: 'text-info-text',
  formula: 'text-action',
};

function TermStack({
  term,
  shortName,
}: {
  term: WorkingTerm;
  shortName: (name: string) => string;
}) {
  if (term.kind === 'symbol' || term.kind === 'operator') {
    return (
      <span className="self-end px-1 font-mono text-data-sm text-muted-foreground">
        {term.text}
      </span>
    );
  }
  const name = term.kind === 'ref' ? shortName(term.name) : term.text;
  const numberClass = term.kind === 'ref' ? TERM_SOURCE_CLASS[term.source] : 'text-foreground';
  return (
    <span
      className={`inline-flex flex-col items-center ${term.kind === 'ref' && term.isDropped ? 'line-through' : ''}`}
    >
      <span className="text-label-2xs text-muted-foreground">{name}</span>
      <span className={`font-mono text-data-sm ${numberClass}`}>{term.text}</span>
    </span>
  );
}

export function WorkbenchFormulaWorking({
  result,
  isCompact,
  shortName,
  onAddMissing,
}: WorkbenchFormulaWorkingProps) {
  if (!result) return null;
  if (result.status === 'empty')
    return <p className="text-label-xs text-muted-foreground">{result.message}</p>;
  if (result.status === 'error') {
    return (
      <p className="text-label-xs text-danger-text">
        {result.message}
        {result.missingName && onAddMissing && (
          <button
            type="button"
            className="ml-2 text-action hover:underline"
            onClick={() => result.missingName && onAddMissing(result.missingName)}
          >
            + Add ‘{result.missingName}’ as a value
          </button>
        )}
      </p>
    );
  }
  const outputError = 'error' in result.output ? result.output.error : undefined;
  if (isCompact && outputError)
    return <p className="text-label-xs text-danger-text">{outputError}</p>;
  const working = result.showsWorking && (
    <div className="flex flex-wrap items-end gap-x-1 gap-y-1">
      {result.terms.map((term, index) => (
        <TermStack key={index} term={term} shortName={shortName} />
      ))}
    </div>
  );
  if (isCompact) return working || null;
  return (
    <div className="flex flex-col gap-1">
      {working}
      {outputError ? (
        <p className="text-label-xs text-danger-text">{outputError}</p>
      ) : (
        <p className="font-mono text-data-sm text-foreground">
          = <span className="text-action">{formulaAnswerText(result)}</span>
          <span className="ml-2 font-sans text-label-xs text-success-text">
            ✓ {describeDimension(result.quantity.dimension)}
          </span>
        </p>
      )}
    </div>
  );
}
