import { createPortal } from 'react-dom';

import {
  FORMULA_FUNCTION_HINTS,
  type FormulaCompletion,
} from '../../../../utils/formulas/formulaScopes';
import { describeName } from '../../../../utils/formulas/nameDisplay';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { FormulaFunction } from '../../../../utils/formulas/formulaParser';

interface WorkbenchFormulaCompletionListProps {
  anchor: HTMLElement;
  options: readonly FormulaCompletion[];
  highlighted: number;
  calculation: BoardCalculation;
  onHighlight: (index: number) => void;
  onAccept: (option: FormulaCompletion) => void;
}

export function WorkbenchFormulaCompletionList({
  anchor,
  options,
  highlighted,
  calculation,
  onHighlight,
  onAccept,
}: WorkbenchFormulaCompletionListProps) {
  const rect = anchor.getBoundingClientRect();
  return createPortal(
    <ul
      role="listbox"
      aria-label="Names and functions"
      style={{ top: rect.bottom + 4, left: rect.left, minWidth: rect.width }}
      className="fixed z-50 max-h-72 overflow-auto border border-line-soft bg-card py-1 shadow-lg"
    >
      {options.map((option, index) => (
        <li
          key={option.name}
          role="option"
          aria-selected={index === highlighted}
          onMouseDown={event => {
            event.preventDefault();
            onAccept(option);
          }}
          onMouseEnter={() => onHighlight(index)}
          className={`flex cursor-pointer items-baseline justify-between gap-4 px-3 py-1 text-body-sm ${
            index === highlighted ? 'bg-primary/10 text-foreground' : 'text-secondary-foreground'
          }`}
        >
          <span>{option.isFunction ? `${option.label}(…)` : option.label}</span>
          <span className="truncate font-mono text-data-sm text-muted-foreground">
            {option.isFunction
              ? FORMULA_FUNCTION_HINTS[option.name as FormulaFunction]
              : describeName(calculation, option.name).text}
          </span>
        </li>
      ))}
    </ul>,
    document.body
  );
}
