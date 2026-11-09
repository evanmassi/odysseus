import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';
import { blankOptions, type BlankOption } from '../../../../utils/steps/stepPresets';
import { useInsertTarget } from '../../tray/useInsertTarget';

import {
  blankAtCaret,
  blankLabel,
  fillBlank,
  fillEditor,
  hasBlanks,
  insertReference,
  insertTemplate,
  jumpToBlank,
  placeCaretAtEnd,
  placeCaretAtPoint,
  readEditor,
} from './stepEditorContent';
import { WorkbenchStepBlankList } from './WorkbenchStepBlankList';

import type { TrayInsertion } from '../../tray/insertTrayStore';

interface WorkbenchStepTextFieldProps {
  text: string;
  rowRef: RefObject<HTMLElement>;
  onTextChange: (text: string) => void;
}

interface BlankSuggestions {
  blank: HTMLElement;
  options: BlankOption[];
  activeIndex: number;
}

export function WorkbenchStepTextField({
  text,
  rowRef,
  onTextChange,
}: WorkbenchStepTextFieldProps) {
  const calculation = useWorkbenchStore(state => state.calculation);
  const editorRef = useRef<HTMLDivElement>(null);
  const initialText = useRef(text);
  const latestCalculation = useRef(calculation);
  latestCalculation.current = calculation;
  const [suggestions, setSuggestions] = useState<BlankSuggestions>();

  const commit = () => {
    if (editorRef.current) onTextChange(readEditor(editorRef.current));
  };

  const insert = (insertion: TrayInsertion) => {
    const editor = editorRef.current;
    if (!editor) return;
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
  });

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    fillEditor(editor, initialText.current, latestCalculation.current);
    placeCaretAtEnd(editor);
  }, []);

  useEffect(() => {
    const showBlankSuggestions = () => {
      const editor = editorRef.current;
      const blank = editor && document.activeElement === editor ? blankAtCaret(editor) : undefined;
      if (!blank) {
        setSuggestions(undefined);
        return;
      }
      const label = blankLabel(blank);
      const typed = blank.textContent ?? '';
      const options = blankOptions(latestCalculation.current, label, typed);
      const isTyped = typed.trim() !== label;
      setSuggestions(
        options.length ? { blank, options, activeIndex: isTyped ? 0 : -1 } : undefined
      );
    };
    document.addEventListener('selectionchange', showBlankSuggestions);
    return () => document.removeEventListener('selectionchange', showBlankSuggestions);
  }, []);

  const pickBlankOption = (option: BlankOption) => {
    const editor = editorRef.current;
    if (!editor || !suggestions) return;
    fillBlank(suggestions.blank, option, calculation);
    setSuggestions(undefined);
    commit();
    if (hasBlanks(editor)) jumpToBlank(editor, false);
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
      pickBlankOption(options[activeIndex]);
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
    if (event.key === 'Tab' && jumpToBlank(event.currentTarget, event.shiftKey)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
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
        <WorkbenchStepBlankList
          anchor={suggestions.blank}
          options={suggestions.options}
          activeIndex={suggestions.activeIndex}
          onPick={pickBlankOption}
        />
      )}
    </>
  );
}
