import { useEffect, useRef, useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';
import { Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Button, Select, Tooltip } from '@shared/ui';

import { usePlacedBeside } from '../../../../hooks/usePlacedBeside';
import { APP_ROOT_ID } from '../../../../utils/dom/appRoot';
import {
  formulaCompletions,
  formulaTextParts,
  formulaWordAt,
  namesInFull,
  namesWithin,
  nameWithin,
  type FormulaCompletion,
} from '../../../../utils/formulas/formulaScopes';
import { autoUnit, AUTO_UNIT } from '../../../../utils/formulas/quantities';
import { displayNameOf } from '../../../../utils/materials/materialLookup';
import { joinValueName } from '../../../../utils/values/valueNames';
import { CALCULATION_UNIT_OPTIONS } from '../../../../utils/values/valueUnits';
import { META_LABEL } from '../../board/metaLabelClass';
import { POPOUT_PANEL } from '../../board/popoutPanelClass';
import { useInsertTarget } from '../../tray/useInsertTarget';
import { WorkbenchTrayToggleButton } from '../../tray/WorkbenchTrayToggleButton';

import { WorkbenchCalculationWorking } from './WorkbenchCalculationWorking';
import { WorkbenchFormulaCompletionList } from './WorkbenchFormulaCompletionList';

import type { SolvedBoard } from '../../../../utils/formulas/boardCalculation';
import type { TrayInsertion } from '../../tray/insertTrayStore';
import type { CalculationsBlock, MaterialItem } from '@odysseus/shared-schemas';

type CalculationItem = CalculationsBlock['items'][number];

interface WorkbenchCalculationEditorProps {
  calculation: CalculationItem;
  material: MaterialItem | undefined;
  board: SolvedBoard;
  anchorOf: () => DOMRect | undefined;
  onChange: (change: Partial<Omit<CalculationItem, 'id'>>) => void;
  onAddMissing: (name: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

const LINE_INPUT = 'w-full text-body-sm text-foreground placeholder:text-muted-foreground';
const FORMULA_TEXT =
  'whitespace-pre-wrap break-words px-2 py-1.5 font-mono text-data-sm leading-relaxed [grid-area:1/1]';

export function WorkbenchCalculationEditor({
  calculation,
  material,
  board,
  anchorOf,
  onChange,
  onAddMissing,
  onRemove,
  onClose,
}: WorkbenchCalculationEditorProps) {
  const expressionRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(() => nameWithin(calculation.name, material));
  const [expression, setExpression] = useState(() =>
    namesWithin(calculation.expr, board, material)
  );
  const [completions, setCompletions] = useState<FormulaCompletion[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const isNameTaken = board.takenNameIds.has(calculation.id);
  const result = board.results.get(calculation.id);
  const shownAutoUnit = result?.status === 'ok' ? autoUnit(result.quantity) : undefined;

  const editorPosition = usePlacedBeside(editorRef, anchorOf);

  useEffect(() => expressionRef.current?.focus(), []);

  useEffect(() => {
    const appRoot = document.getElementById(APP_ROOT_ID);
    const closeOnClickAway = (event: PointerEvent) => {
      if (event.target instanceof Node && appRoot?.contains(event.target)) onClose();
    };
    document.addEventListener('pointerdown', closeOnClickAway, true);
    return () => document.removeEventListener('pointerdown', closeOnClickAway, true);
  }, [onClose]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const refreshCompletions = (text: string, caret: number) => {
    setCompletions(
      formulaCompletions(board, material, formulaWordAt(text, caret).text, calculation.name)
    );
    setHighlighted(0);
  };

  const changeExpression = (text: string, caret: number) => {
    setExpression(text);
    onChange({ expr: namesInFull(text, board, material) });
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
      insertion.kind === 'name' ? namesWithin(insertion.name, board, material) : insertion.token;
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

  return createPortal(
    <div
      ref={editorRef}
      role="dialog"
      aria-label={`Edit ${name || 'calculation'}`}
      className={POPOUT_PANEL}
      style={editorPosition}
    >
      <div className="flex items-start gap-1">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {material && <span className={META_LABEL}>{displayNameOf(material)}</span>}
          <span className="inline-edit">
            <input
              value={name}
              placeholder="Name"
              aria-label="Calculation name"
              spellCheck={false}
              className={`${LINE_INPUT} ${isNameTaken ? 'text-danger-text' : ''}`}
              onChange={event => {
                setName(event.target.value);
                onChange({ name: joinValueName(material?.name.trim() ?? '', event.target.value) });
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') onClose();
              }}
              onBlur={() => {
                const converted = withGreekLetters(name);
                if (converted === name) return;
                setName(converted);
                onChange({ name: joinValueName(material?.name.trim() ?? '', converted) });
              }}
            />
          </span>
        </div>
        <Select
          size="xs"
          isQuiet
          options={[...CALCULATION_UNIT_OPTIONS]}
          value={calculation.unit}
          aria-label="Show the answer in"
          renderValue={([selected]) =>
            selected?.value === AUTO_UNIT ? (shownAutoUnit ?? selected.label) : selected?.label
          }
          onChange={unit => onChange({ unit: String(unit ?? AUTO_UNIT) })}
          className="w-28 flex-none"
        />
        <Tooltip content="Remove">
          <Button
            variant="ghost-danger"
            size="xs"
            iconOnly
            aria-label={`Remove ${name || 'calculation'}`}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>
      <div className="grid border border-line-faint bg-[hsl(var(--input-well))] focus-within:border-primary/60">
        <div aria-hidden className={`${FORMULA_TEXT} text-transparent`}>
          {formulaTextParts(expression, board, material).map((part, index) =>
            part.isName ? (
              <span key={index} className="bg-primary/20 [box-decoration-break:clone]">
                {part.text}
              </span>
            ) : (
              part.text
            )
          )}{' '}
        </div>
        <textarea
          ref={expressionRef}
          rows={1}
          value={expression}
          placeholder="Type names and + − × ÷, or insert them"
          aria-label="Formula"
          spellCheck={false}
          className={`${FORMULA_TEXT} resize-none overflow-hidden bg-transparent text-foreground outline-none placeholder:text-muted-foreground`}
          onChange={event =>
            changeExpression(
              event.target.value.replace(/\s*\n\s*/g, ' '),
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
            onChange({ expr: namesInFull(converted, board, material) });
          }}
          onKeyDown={event => {
            if (!completions.length) {
              if (event.key === 'Enter') {
                event.preventDefault();
                onClose();
              }
              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const step = event.key === 'ArrowDown' ? 1 : -1;
              setHighlighted(index => Math.max(0, Math.min(completions.length - 1, index + step)));
            } else if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              accept(completions[highlighted]);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setCompletions([]);
            }
          }}
        />
      </div>
      <WorkbenchCalculationWorking
        name={calculation.name}
        result={result}
        isCompact={false}
        shortName={full => nameWithin(full, material)}
        onAddMissing={onAddMissing}
      />
      <div className="flex items-center gap-1">
        <WorkbenchTrayToggleButton mode="formula" />
        <Button variant="ghost" size="xs" className="ml-auto" onClick={onClose}>
          Done
        </Button>
      </div>
      {completions.length > 0 && expressionRef.current && (
        <WorkbenchFormulaCompletionList
          anchor={expressionRef.current}
          options={completions}
          highlighted={highlighted}
          board={board}
          onHighlight={setHighlighted}
          onAccept={accept}
        />
      )}
    </div>,
    document.body
  );
}
