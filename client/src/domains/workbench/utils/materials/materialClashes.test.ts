import { conjugateClashes } from './materialClashes';
import { materialFromGuess } from './materialItems';

const antibody = (name: string, conjugate: string, panel = '') => {
  const item = materialFromGuess(
    { group: 'ab', type: 'Antibody', name, values: {}, why: '', source: 'list' },
    {}
  );
  item.values['conjugate'] = conjugate;
  item.values['panel'] = panel;
  return item;
};

describe('conjugateClashes', () => {
  it('flags two antibodies sharing a fluorochrome in the same panel', () => {
    const clashes = conjugateClashes([
      antibody('CD4', 'BV421'),
      antibody('CD8', 'Brilliant Violet 421'),
      antibody('CD3', 'BV421', 'Tube 2'),
      antibody('CD19', 'Biotin'),
      antibody('CD20', 'Biotin'),
    ]);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].items.map(item => item.name)).toEqual(['CD4', 'CD8']);
    expect(clashes[0].panel).toBe('');
  });
});
