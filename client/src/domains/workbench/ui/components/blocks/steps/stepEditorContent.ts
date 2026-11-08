import { describeName } from '../../../../utils/formulas/nameDisplay';
import { parseStepTemplate } from '../../../../utils/steps/stepTemplate';

import { referenceToneClass } from './stepReferenceTone';

import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { BlankOption } from '../../../../utils/steps/stepPresets';

const REFERENCE_ATTRIBUTE = 'data-ref';
const BLANK_ATTRIBUTE = 'data-blank';
const NO_BREAK_SPACES = new RegExp(String.fromCharCode(0xa0), 'g');

const CHIP = 'cursor-default select-all border-b border-dotted border-primary/70';
const BLANK_SLOT = 'border-b border-dashed border-warning-text/75 bg-warning-text/[0.12] px-0.5';

function chipNode(name: string, calculation: BoardCalculation): HTMLSpanElement {
  const display = describeName(calculation, name);
  const chip = document.createElement('span');
  chip.className = `${CHIP} ${referenceToneClass(display)}`;
  chip.contentEditable = 'false';
  chip.setAttribute(REFERENCE_ATTRIBUTE, name);
  chip.title = name;
  chip.textContent = display.text;
  return chip;
}

function slotNode(label: string): HTMLSpanElement {
  const slot = document.createElement('span');
  slot.className = BLANK_SLOT;
  slot.setAttribute(BLANK_ATTRIBUTE, label);
  slot.textContent = label;
  return slot;
}

const templateNodes = (text: string, calculation: BoardCalculation): Node[] =>
  parseStepTemplate(text).map(part => {
    if (part.kind === 'reference') return chipNode(part.name, calculation);
    if (part.kind === 'blank') return slotNode(part.label);
    return document.createTextNode(part.text);
  });

function select(range: Range) {
  const selection = getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function selectContents(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  select(range);
}

function caretRange(editor: HTMLElement): Range {
  const selection = getSelection();
  if (selection?.rangeCount) {
    const range = selection.getRangeAt(0);
    if (editor.contains(range.startContainer)) return range;
  }
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
}

const blanksIn = (editor: HTMLElement) => [
  ...editor.querySelectorAll<HTMLElement>(`[${BLANK_ATTRIBUTE}]`),
];

export function fillEditor(editor: HTMLElement, text: string, calculation: BoardCalculation) {
  editor.replaceChildren(...templateNodes(text, calculation));
}

export function readEditor(node: Node): string {
  return [...node.childNodes]
    .map(child => {
      if (child.nodeType === Node.TEXT_NODE) return child.textContent ?? '';
      if (!(child instanceof HTMLElement)) return '';
      const reference = child.getAttribute(REFERENCE_ATTRIBUTE);
      if (reference) return `{${reference}}`;
      const blank = child.getAttribute(BLANK_ATTRIBUTE);
      const shown = (child.textContent ?? '').trim();
      if (blank !== null && (shown === blank || !shown)) return `‹${blank}›`;
      return child.nodeName === 'BR' ? '' : readEditor(child);
    })
    .join('')
    .replace(NO_BREAK_SPACES, ' ');
}

export function placeCaretAtEnd(editor: HTMLElement) {
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  select(range);
}

export function placeCaretAtPoint(editor: HTMLElement, x: number, y: number) {
  const position = document.caretPositionFromPoint?.(x, y);
  const range = position ? document.createRange() : document.caretRangeFromPoint?.(x, y);
  if (position && range) range.setStart(position.offsetNode, position.offset);
  if (range && editor.contains(range.startContainer)) select(range);
}

export function insertReference(editor: HTMLElement, name: string, calculation: BoardCalculation) {
  const range = caretRange(editor);
  range.deleteContents();
  const { startContainer, startOffset } = range;
  const charBefore =
    startContainer.nodeType === Node.TEXT_NODE
      ? (startContainer.textContent ?? '')[startOffset - 1]
      : '';
  const spaceAfter = document.createTextNode(' ');
  range.insertNode(spaceAfter);
  range.insertNode(chipNode(name, calculation));
  if (charBefore && /\S/.test(charBefore)) range.insertNode(document.createTextNode(' '));
  range.setStartAfter(spaceAfter);
  range.collapse(true);
  select(range);
}

export function insertTemplate(editor: HTMLElement, text: string, calculation: BoardCalculation) {
  const range = caretRange(editor);
  range.deleteContents();
  const existing = editor.textContent ?? '';
  const fragment = document.createDocumentFragment();
  if (existing.trim() && !/\s$/.test(existing)) fragment.append(' ');
  fragment.append(...templateNodes(text, calculation));
  range.insertNode(fragment);
  const firstBlank = blanksIn(editor)[0];
  if (firstBlank) selectContents(firstBlank);
}

export function jumpToBlank(editor: HTMLElement, isBackwards: boolean): boolean {
  const blanks = blanksIn(editor);
  if (!blanks.length) return false;
  const selection = getSelection();
  const caret = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
  const isAtCaret = (blank: HTMLElement) => !!caret && blank.contains(caret.startContainer);
  const others = blanks.filter(blank => !isAtCaret(blank));
  const ahead = others.filter(blank => !caret || caret.comparePoint(blank, 0) === 1);
  const behind = others.filter(blank => caret && caret.comparePoint(blank, 0) === -1);
  const next = isBackwards
    ? (behind[behind.length - 1] ?? blanks[blanks.length - 1])
    : (ahead[0] ?? blanks[0]);
  selectContents(next);
  return true;
}

export function blankAtCaret(editor: HTMLElement): HTMLElement | undefined {
  const node = getSelection()?.anchorNode;
  if (!node) return undefined;
  const element = node instanceof Element ? node : node.parentElement;
  const blank = element?.closest<HTMLElement>(`[${BLANK_ATTRIBUTE}]`);
  return blank && editor.contains(blank) ? blank : undefined;
}

export function fillBlank(blank: HTMLElement, option: BlankOption, calculation: BoardCalculation) {
  const filled = option.name
    ? chipNode(option.name, calculation)
    : document.createTextNode(option.text);
  blank.replaceWith(filled);
  const caret = document.createRange();
  caret.setStartAfter(filled);
  select(caret);
}

export const blankLabel = (blank: HTMLElement): string => blank.getAttribute(BLANK_ATTRIBUTE) ?? '';

export const hasBlanks = (editor: HTMLElement): boolean => blanksIn(editor).length > 0;
