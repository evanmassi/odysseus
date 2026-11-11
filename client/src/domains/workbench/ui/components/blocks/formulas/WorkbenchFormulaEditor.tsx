import { useEffect, useRef, useState } from 'react';

import { Button, Select } from '@shared/ui';

import {
  formulaCompletions,
  formulaWordAt,
  namesInFull,
  namesWithin,
  nameWithin,
  type FormulaCompletion,
} from '../../../../utils/formulas/formulaScopes';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';
import { joinValueName } from '../../../../utils/values/valueNames';
import { FORMULA_UNIT_OPTIONS } from '../../../../utils/values/valueUnits';
import { useInsertTarget } from '../../tray/useInsertTarget';
import { WorkbenchTrayToggleButton } from '../../tray/WorkbenchTrayToggleButton';

import { WorkbenchFormulaBoardNumberList } from './WorkbenchFormulaBoardNumberList';
import { WorkbenchFormulaCompletionList } from './WorkbenchFormulaCompletionList';
import { WorkbenchFormulaWorking } from './WorkbenchFormulaWorking';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { SectionNumber } from '../../../../utils/formulas/calculationSections';
import type { TrayInsertion } from '../../tray/insertTrayStore';
import type { FormulaBlock, MaterialItem } from '@odysseus/shared-schemas';

type FormulaItem = FormulaBlock['items'][number];

interface WorkbenchFormulaEditorProps {
  formula: FormulaItem;
  material: MaterialItem | undefined;
  calculation: BoardCalculation;
  boardNumbers: readonly SectionNumber[];
  onChange: (change: Partial<Omit<FormulaItem, 'id'>>) => void;
  onAddMissing: (name: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

const LINE_INPUT = 'w-full text-body-sm text-foreground placeholder:text-muted-foreground';

export function WorkbenchFormulaEditor({
  formula,
  material,
  calculation,
  boardNumbers,
  onChange,
  onAddMissing,
  onRemove,
  onClose,
}: WorkbenchFormulaEditorProps) {
  const expressionRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(() => nameWithin(formula.name, material));
  const [expression, setExpression] = useState(() =>
    namesWithin(formula.expr, calculation, material)
  );
  const [completions, setCompletions] = useState<FormulaCompletion[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const isDuplicate = calculation.duplicateIds.has(formula.id);

  useEffect(() => expressionRef.current?.focus(), []);

  const refreshCompletions = (text: string, caret: number) => {
    setCompletions(
      formulaCompletions(calculation, material, formulaWordAt(text, caret).text, formula.name)
    );
    setHighlighted(0);
  };

  const changeExpression = (text: string, caret: number) => {
    setExpression(text);
    onChange({ expr: namesInFull(text, calculation, material) });
    refreshCompletions(text, caret);
  };

  const accept = (option: FormulaCompletion) => {
    const input = expressionRef.current;
    if (!input) return;
    const { start, end } = formulaWordAt(expression, input.selectionStart ?? expression.length);
    const inserted = option.isFunction ? `${option.label}(` : `${option.label} `;
    const text = expression.slice(0, start) + inserted + expression.slice(end);
    changeExpression(text, start + inserted.length);
    setCompletions([]);
    requestAnimationFrame(() =>
      input.setSelectionRange(start + inserted.length, start + inserted.length)
    );
  };

  const insertFromTray = (insertion: TrayInsertion) => {
    const input = expressionRef.current;
    if (!input || insertion.kind === 'preset') return;
    const text =
      insertion.kind === 'name'
        ? namesWithin(insertion.name, calculation, material)
        : insertion.token;
    let start = input.selectionStart ?? expression.length;
    const end = input.selectionEnd ?? start;
    if (text === ')' && expression[start - 1] === ' ') start -= 1;
    const lead = text !== ')' && /[^\s(]$/.test(expression.slice(0, start)) ? ' ' : '';
    const trail = text.endsWith('(') ? '' : ' ';
    const inserted = `${lead}${text}${trail}`;
    const caret = start + inserted.length;
    changeExpression(expression.slice(0, start) + inserted + expression.slice(end), caret);
    setCompletions([]);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };

  const trayTarget = useInsertTarget({
    mode: 'formula',
    anchorRef: editorRef,
    insert: insertFromTray,
  });

  return (
    <div
      ref={editorRef}
      className="flex flex-col gap-2 border-l-2 border-primary/60 bg-foreground/[0.025] px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span className="inline-edit min-w-0 flex-1">
          <input
            value={name}
            placeholder="Name"
            aria-label="Formula name"
            spellCheck={false}
            className={`${LINE_INPUT} ${isDuplicate ? 'text-danger-text' : ''}`}
            onChange={event => {
              setName(event.target.value);
              onChange({ name: joinValueName(material?.name.trim() ?? '', event.target.value) });
            }}
            onBlur={() => {
              const converted = withGreekLetters(name);
              if (converted === name) return;
              setName(converted);
              onChange({ name: joinValueName(material?.name.trim() ?? '', converted) });
            }}
          />
        </span>
        <Select
          size="xs"
          isQuiet
          options={[...FORMULA_UNIT_OPTIONS]}
          value={formula.unit}
          aria-label="Show the answer in"
          onChange={unit => onChange({ unit: String(unit ?? 'auto') })}
          className="w-28"
        />
      </div>
      <WorkbenchFormulaBoardNumberList numbers={boardNumbers} />
      <div className="flex items-center gap-2">
        <span className="font-mono text-data-sm text-muted-foreground">=</span>
        <span className="inline-edit min-w-0 flex-1">
          <input
            ref={expressionRef}
            value={expression}
            placeholder="click names, or type"
            aria-label="Formula"
            spellCheck={false}
            className={`${LINE_INPUT} font-mono`}
            onChange={event =>
              changeExpression(
                event.target.value,
                event.target.selectionStart ?? event.target.value.length
              )
            }
            onFocus={trayTarget.onFocus}
            onBlur={event => {
              setCompletions([]);
              trayTarget.onBlur(event);
              const converted = withGreekLetters(expression);
              if (converted === expression) return;
              setExpression(converted);
              onChange({ expr: namesInFull(converted, calculation, material) });
            }}
            onKeyDown={event => {
              if (!completions.length) {
                if (event.key === 'Escape') onClose();
                return;
              }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                setHighlighted(index =>
                  Math.max(0, Math.min(completions.length - 1, index + step))
                );
              } else if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                accept(completions[highlighted]);
              } else if (event.key === 'Escape') {
                setCompletions([]);
              }
            }}
          />
        </span>
      </div>
      <WorkbenchTrayToggleButton mode="formula" />
      <WorkbenchFormulaWorking
        result={calculation.results.get(formula.id)}
        isCompact={false}
        shortName={full => nameWithin(full, material)}
        onAddMissing={onAddMissing}
      />
      <div className="flex justify-end gap-1">
        <Button variant="ghost-danger" size="xs" onClick={onRemove}>
          Remove
        </Button>
        <Button variant="ghost" size="xs" onClick={onClose}>
          Done
        </Button>
      </div>
      {completions.length > 0 && expressionRef.current && (
        <WorkbenchFormulaCompletionList
          anchor={expressionRef.current}
          options={completions}
          highlighted={highlighted}
          calculation={calculation}
          onHighlight={setHighlighted}
          onAccept={accept}
        />
      )}
    </div>
  );
}
