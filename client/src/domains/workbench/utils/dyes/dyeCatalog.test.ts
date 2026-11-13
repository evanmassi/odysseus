import { BUILT_IN_CATALOG, dyeCatalog, dyeLaserLabel, dyeSpelling, laserLabel } from './dyeCatalog';

describe('BUILT_IN_CATALOG', () => {
  it('finds a dye by any spelling and gives its lasers and emission peak', () => {
    expect(BUILT_IN_CATALOG.find('Brilliant Violet 421')).toMatchObject({
      name: 'BV421',
      lasers: [405],
      peak: 422,
      kind: 'conjugate',
    });
    expect(BUILT_IN_CATALOG.find('bv-421')?.name).toBe('BV421');
    expect(BUILT_IN_CATALOG.find('BV 421')?.name).toBe('BV421');
    expect(BUILT_IN_CATALOG.find('AF647')?.name).toBe('Alexa Fluor 647');
    expect(BUILT_IN_CATALOG.find('PE-TxRed')).toMatchObject({ name: 'PE-Texas Red', peak: 615 });
  });

  it('lets the PE family use the yellow-green or blue laser, yellow-green first', () => {
    expect(BUILT_IN_CATALOG.find('PE')?.lasers).toEqual([561, 488]);
    expect(dyeLaserLabel(BUILT_IN_CATALOG.find('PE-Cy7')!)).toBe('Yellow-green 561 or Blue 488');
  });

  it('knows viability dyes, fluorescent proteins and nothing about chemical conjugates', () => {
    expect(BUILT_IN_CATALOG.find('Zombie NIR')).toMatchObject({
      lasers: [640],
      peak: 746,
      kind: 'viability',
      isFixable: true,
    });
    expect(BUILT_IN_CATALOG.find('mCherry')?.kind).toBe('protein');
    expect(BUILT_IN_CATALOG.find('Biotin')).toBeUndefined();
  });

  it('gives every dye a laser and a peak', () => {
    const incomplete = BUILT_IN_CATALOG.dyes.filter(
      dye => dye.lasers.length === 0 || !(dye.peak > 0)
    );
    expect(incomplete).toEqual([]);
  });

  it('gives each spelling to one dye only', () => {
    const shared = BUILT_IN_CATALOG.dyes.flatMap(dye =>
      [dye.name, ...dye.aliases].flatMap(spelling => {
        const owner = BUILT_IN_CATALOG.find(spelling)?.name;
        return owner === dye.name ? [] : [`${spelling} (${dye.name} and ${owner})`];
      })
    );
    expect(shared).toEqual([]);
  });
});

describe('dyeCatalog', () => {
  it('adds the file’s own dyes after the built-in list', () => {
    const fileDyes = [{ name: 'NewDye 512', lasers: [488], peak: 512 }];
    const catalog = dyeCatalog(fileDyes);
    expect(catalog.find('newdye512')).toMatchObject({ name: 'NewDye 512', isYours: true });
    expect(catalog.find('BV421')?.isYours).toBe(false);
    expect(dyeCatalog(fileDyes)).toBe(catalog);
    expect(dyeCatalog([])).toBe(BUILT_IN_CATALOG);
  });
});

describe('labels and spelling', () => {
  it('names standard lasers by color and others by wavelength', () => {
    expect(laserLabel(405)).toBe('Violet 405');
    expect(laserLabel(532)).toBe('532 nm');
  });

  it('snaps a known spelling to the list’s and keeps an unknown one as typed', () => {
    expect(dyeSpelling(BUILT_IN_CATALOG, ' bv-421 ')).toBe('BV421');
    expect(dyeSpelling(BUILT_IN_CATALOG, ' Mystery Fluor 9 ')).toBe('Mystery Fluor 9');
  });
});
