import { conjugateConflicts } from './conjugateConflicts';
import { materialFromGuess } from './materialItems';
import { EMPTY_LAB_MEMORY } from './materialMemory';

const antibody = (name: string, conjugate: string, panel = '') => {
  const item = materialFromGuess(
    { group: 'ab', type: 'Antibody', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );
  item.values['conjugate'] = conjugate;
  item.values['panel'] = panel;
  return item;
};

describe('conjugateConflicts', () => {
  it('flags two antibodies sharing a fluor in the same panel', () => {
    const conflicts = conjugateConflicts([
      antibody('CD4', 'BV421'),
      antibody('CD8', 'Brilliant Violet 421'),
      antibody('CD3', 'BV421', 'Tube 2'),
      antibody('CD19', 'Biotin'),
      antibody('CD20', 'Biotin'),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].items.map(item => item.name)).toEqual(['CD4', 'CD8']);
    expect(conflicts[0].panel).toBe('');
  });
});
