import { withGreekLetters } from './greekLetters';
import { normalizeMaterialKey } from './materialGuesser';

describe('spelled-out Greek letters', () => {
  it('turn into the letter when attached to a name', () => {
    expect(withGreekLetters('IL-1beta')).toBe('IL-1β');
    expect(withGreekLetters('TNF-alpha')).toBe('TNF-α');
    expect(withGreekLetters('TGF-Beta1')).toBe('TGF-β1');
    expect(withGreekLetters('IFNgamma')).toBe('IFNγ');
    expect(withGreekLetters('beta-actin')).toBe('β-actin');
    expect(withGreekLetters('IL-1beta and TNF-alpha')).toBe('IL-1β and TNF-α');
  });

  it('leave words alone', () => {
    expect(withGreekLetters('Interferon gamma')).toBe('Interferon gamma');
    expect(withGreekLetters('betaine')).toBe('betaine');
    expect(withGreekLetters('Alphabet soup')).toBe('Alphabet soup');
    expect(withGreekLetters('Delta-like ligand 4')).toBe('Delta-like ligand 4');
    expect(withGreekLetters('gamma irradiated')).toBe('gamma irradiated');
  });

  it('match the letter when names are compared', () => {
    expect(normalizeMaterialKey('IL-1beta')).toBe(normalizeMaterialKey('IL-1β'));
    expect(normalizeMaterialKey('TNF-alpha')).toBe(normalizeMaterialKey('TNF-α'));
  });
});
