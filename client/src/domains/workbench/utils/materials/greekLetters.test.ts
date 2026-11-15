import { withGreekLetters } from './greekLetters';
import { normalizeMaterialKey } from './materialKey';

describe('spelled-out Greek letters', () => {
  it('turn into the letter when attached to a name', () => {
    expect(withGreekLetters('IL-1beta')).toBe('IL-1β');
    expect(withGreekLetters('TNF-alpha')).toBe('TNF-α');
    expect(withGreekLetters('TGF-Beta1')).toBe('TGF-β1');
    expect(withGreekLetters('IFNgamma')).toBe('IFNγ');
    expect(withGreekLetters('beta-actin')).toBe('β-actin');
    expect(withGreekLetters('IL-1beta and TNF-alpha')).toBe('IL-1β and TNF-α');
  });

  it('turn into the letter before a capital, another letter name or a one-letter ending', () => {
    expect(withGreekLetters('RORgammat')).toBe('RORγt');
    expect(withGreekLetters('NFkappaB')).toBe('NFκB');
    expect(withGreekLetters('NF-kappaB')).toBe('NF-κB');
    expect(withGreekLetters('IFNgammaR1')).toBe('IFNγR1');
    expect(withGreekLetters('TCRalphabeta')).toBe('TCRαβ');
    expect(withGreekLetters('gammadelta T cells')).toBe('γδ T cells');
    expect(withGreekLetters('Gammadelta T cells')).toBe('γδ T cells');
  });

  it('turn into the letter at the start before a number, and cover theta, zeta and omega', () => {
    expect(withGreekLetters('beta2-microglobulin')).toBe('β2-microglobulin');
    expect(withGreekLetters('alpha1-antitrypsin')).toBe('α1-antitrypsin');
    expect(withGreekLetters('PKCtheta')).toBe('PKCθ');
    expect(withGreekLetters('CD3zeta')).toBe('CD3ζ');
    expect(withGreekLetters('omega-3')).toBe('ω-3');
  });

  it('leave words alone', () => {
    expect(withGreekLetters('Interferon gamma')).toBe('Interferon gamma');
    expect(withGreekLetters('betaine')).toBe('betaine');
    expect(withGreekLetters('Alphabet soup')).toBe('Alphabet soup');
    expect(withGreekLetters('analphabet')).toBe('analphabet');
    expect(withGreekLetters('Delta-like ligand 4')).toBe('Delta-like ligand 4');
    expect(withGreekLetters('gamma irradiated')).toBe('gamma irradiated');
    expect(withGreekLetters('gamma delta T cells')).toBe('gamma delta T cells');
    expect(withGreekLetters('IgG1 kappa')).toBe('IgG1 kappa');
    expect(withGreekLetters('Sigma-Aldrich')).toBe('Sigma-Aldrich');
    expect(withGreekLetters('MilliporeSigma')).toBe('MilliporeSigma');
  });

  it('match the letter when names are compared', () => {
    expect(normalizeMaterialKey('IL-1beta')).toBe(normalizeMaterialKey('IL-1β'));
    expect(normalizeMaterialKey('TNF-alpha')).toBe(normalizeMaterialKey('TNF-α'));
    expect(normalizeMaterialKey('RORgammat')).toBe(normalizeMaterialKey('RORγt'));
    expect(normalizeMaterialKey('PKCtheta')).toBe(normalizeMaterialKey('PKCθ'));
  });
});
