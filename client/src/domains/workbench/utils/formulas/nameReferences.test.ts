import { readReference, referenceParts, referenceText, shownReferences } from './nameReferences';

describe('saved references', () => {
  it('keeps an id holding the characters a reference is written with', () => {
    const reference = { name: 'Raji | spare', id: 'run|1:{prep}%' };
    expect(readReference(referenceText(reference))).toEqual(reference);
  });

  it('reads plain text as a name still waiting', () => {
    expect(readReference(' 10 ')).toEqual({ name: '10' });
    expect(readReference('{Per well}')).toEqual({ name: 'Per well' });
  });

  it('splits text around its references and shows them by name', () => {
    const text = 'Add {Per well|v1} to {Plate}';
    expect(referenceParts(text)).toEqual([
      { kind: 'text', text: 'Add ' },
      { kind: 'reference', name: 'Per well', id: 'v1' },
      { kind: 'text', text: ' to ' },
      { kind: 'reference', name: 'Plate' },
    ]);
    expect(shownReferences(text)).toBe('Add Per well to Plate');
  });
});
