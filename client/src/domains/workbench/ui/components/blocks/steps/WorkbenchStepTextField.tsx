import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';
import {
  blankOptions,
  referenceOptions,
  type BlankOption,
} from '../../../../utils/steps/stepPresets';
import { useInsertTarget } from '../../tray/useInsertTarget';

import {
  blankAtCaret,
  blankLabel,
  caretInside,
  fillBlank,
  fillEditor,
  insertReference,
  insertTemplate,
  jumpToNextBlank,
  placeCaretAtEnd,
  placeCaretAtPoint,
  readEditor,
  replaceTypedReference,
  restoreCaret,
  typedReferenceAtCaret,
} from './stepEditorContent';
import { WorkbenchStepSuggestionList } from './WorkbenchStepSuggestionList';

import type { TrayInsertion } from '../../tray/insertTrayStore';

interface WorkbenchStepTextFieldProps {
  text: string;
  rowRef: RefObject<HTMLElement>;
  onTextChange: (text: string) => void;
  onShiftLevel: (shift: 1 | -1) => void;
  onAddStepBelow: () => void;
  onLeave: () => void;
}

interface Suggestions {
  kind: 'blank' | 'reference';
  anchor: HTMLElement;
  options: BlankOption[];
  activeIndex: number;
}

export function WorkbenchStepTextField({
  text,
  rowRef,
  onTextChange,
  onShiftLevel,
  onAddStepBelow,
  onLeave,
}: WorkbenchStepTextFieldProps) {
  const calculation = useWorkbenchStore(state => state.calculation);
  const editorRef = useRef<HTMLDivElement>(null);
  const initialText = useRef(text);
  const latestCalculation = useRef(calculation);
  latestCalculation.current = calculation;
  const lastCaret = useRef<Range>();
  const [suggestions, setSuggestions] = useState<Suggestions>();

  const commit = () => {
    if (editorRef.current) onTextChange(readEditor(editorRef.current));
  };

  const insert = (insertion: TrayInsertion) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) restoreCaret(editor, lastCaret.current);
    if (insertion.kind === 'name') insertReference(editor, insertion.name, calculation);
    else if (insertion.kind === 'preset') insertTemplate(editor, insertion.text, calculation);
    else return;
    commit();
  };

  const { onFocus, onBlur } = useInsertTarget({
    mode: 'step',
    anchorRef: rowRef,
    insert,
    placeCaretAt: (x, y) => {
      if (editorRef.current) placeCaretAtPoint(editorRef.current, x, y);
    },
    onLeave,
  });

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    fillEditor(editor, initialText.current, latestCalculation.current);
    placeCaretAtEnd(editor);
  }, []);

  useEffect(() => {
    const showSuggestions = () => {
      const editor = editorRef.current;
      if (!editor || document.activeElement !== editor) {
        setSuggestions(undefined);
        return;
      }
      lastCaret.current = caretInside(editor) ?? lastCaret.current;
      const blank = blankAtCaret(editor);
      if (blank) {
        const label = blankLabel(blank);
        const typed = blank.textContent ?? '';
        const options = blankOptions(latestCalculation.current, label, typed);
        const isTyped = typed.trim() !== label;
        setSuggestions(
          options.length
            ? { kind: 'blank', anchor: blank, options, activeIndex: isTyped ? 0 : -1 }
            : undefined
        );
        return;
      }
      const typedReference = typedReferenceAtCaret(editor);
      const options =
        typedReference === undefined
          ? []
          : referenceOptions(latestCalculation.current, typedReference);
      setSuggestions(
        options.length ? { kind: 'reference', anchor: editor, options, activeIndex: 0 } : undefined
      );
    };
    document.addEventListener('selectionchange', showSuggestions);
    return () => document.removeEventListener('selectionchange', showSuggestions);
  }, []);

  const pickOption = (option: BlankOption) => {
    const editor = editorRef.current;
    if (!editor || !suggestions) return;
    if (suggestions.kind === 'blank') fillBlank(suggestions.anchor, option, calculation);
    else if (option.name) replaceTypedReference(editor, option.name, calculation);
    setSuggestions(undefined);
    commit();
    if (suggestions.kind === 'blank') jumpToNextBlank(editor);
  };

  const steerSuggestions = (event: KeyboardEvent<HTMLDivElement>): boolean => {
    if (!suggestions) return false;
    const { options, activeIndex } = suggestions;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = Math.max(0, Math.min(options.length - 1, activeIndex + step));
      setSuggestions({ ...suggestions, activeIndex: next });
      return true;
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && activeIndex >= 0) {
      pickOption(options[activeIndex]);
      return true;
    }
    if (event.key === 'Escape') {
      setSuggestions(undefined);
      return true;
    }
    return false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (steerSuggestions(event)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      onShiftLevel(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) onAddStepBelow();
      else event.currentTarget.blur();
    }
  };

  return (
    <>
      <div
        ref={editorRef}
        role="textbox"
        tabIndex={0}
        aria-label="Step text"
        aria-multiline="false"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder="Write the step"
        data-focus="underline"
        className="min-h-[21px] cursor-text whitespace-pre-wrap px-0.5 pb-0.5 leading-normal shadow-[inset_0_-1px_0_hsl(var(--primary)/0.6)] outline-none empty:before:italic empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] data-[drop-ok]:shadow-[var(--input-focus-shadow),0_0_0_2px_hsl(var(--primary)/0.55)]"
        onInput={commit}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={event => {
          setSuggestions(undefined);
          onBlur(event);
          const editor = editorRef.current;
          if (!editor) return;
          const typed = readEditor(editor);
          const converted = withGreekLetters(typed);
          if (converted === typed) return;
          fillEditor(editor, converted, calculation);
          onTextChange(converted);
        }}
      />
      {suggestions && (
        <WorkbenchStepSuggestionList
          anchor={suggestions.anchor}
          options={suggestions.options}
          activeIndex={suggestions.activeIndex}
          onPick={pickOption}
        />
      )}
    </>
  );
}
