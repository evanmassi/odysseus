import { calculateBoard } from '../../../../utils/formulas/boardCalculation';

import { readEditor, replaceTypedReference, typedReferenceAtCaret } from './stepEditorContent';

const calculation = calculateBoard([
  { kind: 'value', id: 'v1', name: 'Spin time', value: '5', unit: 'min' },
]);

function editorWith(text: string, caret: number) {
  const editor = document.createElement('div');
  editor.textContent = text;
  document.body.append(editor);
  const range = document.createRange();
  range.setStart(editor.firstChild as Text, caret);
  range.collapse(true);
  getSelection()?.removeAllRanges();
  getSelection()?.addRange(range);
  return editor;
}

describe('typed references', () => {
  it('reads what follows an open brace before the caret', () => {
    expect(typedReferenceAtCaret(editorWith('Spin for {spi', 13))).toBe('spi');
    expect(typedReferenceAtCaret(editorWith('Spin for {spi', 9))).toBeUndefined();
    expect(typedReferenceAtCaret(editorWith('Spin {a} for', 12))).toBeUndefined();
  });

  it('swaps the typed brace for the picked name', () => {
    const editor = editorWith('Spin for {spi', 13);
    replaceTypedReference(editor, 'Spin time', calculation);
    expect(readEditor(editor)).toBe('Spin for {Spin time} ');
  });
});
