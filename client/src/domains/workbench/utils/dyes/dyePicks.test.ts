import { BUILT_IN_CATALOG, dyeCatalog } from './dyeCatalog';
import { conjugatePicks, resolveDye } from './dyePicks';

const MATERIALS = { includesOtherConjugates: true };
const PANEL = { includesOtherConjugates: false };

const names = (picks: ReturnType<typeof conjugatePicks>) => picks.map(pick => pick.name);

describe('conjugatePicks', () => {
  it('lists every antibody dye grouped by laser in peak order, other conjugates last', () => {
    const picks = conjugatePicks(BUILT_IN_CATALOG, [], '', MATERIALS);
    expect(picks[0].group).toBe('UV 355');
    const violet = picks.filter(pick => pick.group === 'Violet 405').map(pick => pick.peak!);
    expect(violet).toEqual([...violet].sort((a, b) => a - b));
    expect(names(picks.slice(-3))).toEqual(['HRP', 'Biotin', 'AP']);
    expect(names(picks)).not.toContain('GFP');
    expect(names(picks)).not.toContain('Zombie NIR');
  });

  it('finds a dye by any spelling as you type', () => {
    expect(names(conjugatePicks(BUILT_IN_CATALOG, [], 'bv 42', PANEL))).toEqual(['BV421', 'bv 42']);
    expect(names(conjugatePicks(BUILT_IN_CATALOG, [], 'af647', PANEL))).toContain(
      'Alexa Fluor 647'
    );
  });

  it('offers to add a dye the list does not have', () => {
    expect(conjugatePicks(BUILT_IN_CATALOG, [], 'NewDye 512', PANEL)).toEqual([
      { name: 'NewDye 512', group: 'Not in the list', isNew: true },
    ]);
    expect(conjugatePicks(BUILT_IN_CATALOG, [], 'BV421', PANEL).some(pick => pick.isNew)).toBe(
      false
    );
    expect(conjugatePicks(BUILT_IN_CATALOG, [], 'hrp', MATERIALS).some(pick => pick.isNew)).toBe(
      false
    );
  });

  it('lists your own dyes, from the file or remembered, under their laser', () => {
    const catalog = dyeCatalog([{ name: 'Qx 512', lasers: [488], peak: 512 }]);
    const remembered = [
      { name: 'Qx 700', lasers: [640], peak: 700 },
      { name: 'Qx 512', lasers: [488], peak: 512 },
    ];
    const picks = conjugatePicks(catalog, remembered, 'qx', PANEL).filter(pick => !pick.isNew);
    expect(picks).toEqual([
      { name: 'Qx 512', group: 'Blue 488', peak: 512 },
      { name: 'Qx 700', group: 'Red 640', peak: 700 },
    ]);
  });
});

describe('resolveDye', () => {
  const remembered = [{ name: 'Qx 512', lasers: [488], peak: 512 }];

  it('spells a known dye the list’s way', () => {
    expect(resolveDye(BUILT_IN_CATALOG, remembered, 'bv-421')).toEqual({ name: 'BV421' });
  });

  it('brings a remembered dye into the file', () => {
    expect(resolveDye(BUILT_IN_CATALOG, remembered, 'qx512')).toEqual({
      name: 'Qx 512',
      toKeep: remembered[0],
    });
  });

  it('keeps anything else as typed', () => {
    expect(resolveDye(BUILT_IN_CATALOG, remembered, ' Mystery 9 ')).toEqual({ name: 'Mystery 9' });
    expect(resolveDye(BUILT_IN_CATALOG, remembered, '')).toEqual({ name: '' });
  });
});
