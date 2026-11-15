import { isValidElement } from 'react';

import { capsKeepingGreek } from './capsKeepingGreek';

const shown = (text: string) =>
  capsKeepingGreek(text).map(part =>
    isValidElement<{ children: string }>(part) ? `[${part.props.children}]` : part
  );

describe('capitals that keep Greek letters', () => {
  it('sets Greek letters and the micro sign apart so only they keep their case', () => {
    expect(shown('IFN-γ PE-Cy7')).toEqual(['IFN-', '[γ]', ' PE-Cy7']);
    expect(shown('γδ T cells per 50 µL')).toEqual(['', '[γδ]', ' T cells per 50 ', '[µ]', 'L']);
    expect(shown('Stock concentration')).toEqual(['Stock concentration']);
  });
});
