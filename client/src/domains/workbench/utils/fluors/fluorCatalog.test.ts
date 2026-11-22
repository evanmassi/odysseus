import { BUILT_IN_CATALOG, fluorCatalog, fluorSpelling, laserLabel } from './fluorCatalog';

describe('BUILT_IN_CATALOG', () => {
  it('finds a fluor by any spelling and gives its lasers and emission peak', () => {
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

  it('gives every fluor a laser and a peak', () => {
    const incomplete = BUILT_IN_CATALOG.fluors.filter(
      fluor => fluor.lasers.length === 0 || !(fluor.peak > 0)
    );
    expect(incomplete).toEqual([]);
  });

  it('gives each spelling to one fluor only', () => {
    const shared = BUILT_IN_CATALOG.fluors.flatMap(fluor =>
      [fluor.name, ...fluor.aliases].flatMap(spelling => {
        const owner = BUILT_IN_CATALOG.find(spelling)?.name;
        return owner === fluor.name ? [] : [`${spelling} (${fluor.name} and ${owner})`];
      })
    );
    expect(shared).toEqual([]);
  });
});

describe('fluorCatalog', () => {
  it('adds the file’s own fluors after the built-in list', () => {
    const fileFluors = [{ name: 'NewDye 512', lasers: [488], peak: 512 }];
    const catalog = fluorCatalog(fileFluors);
    expect(catalog.find('newdye512')).toMatchObject({ name: 'NewDye 512', isYours: true });
    expect(catalog.find('BV421')?.isYours).toBe(false);
    expect(fluorCatalog(fileFluors)).toBe(catalog);
    expect(fluorCatalog([])).toBe(BUILT_IN_CATALOG);
  });
});

describe('labels and spelling', () => {
  it('names standard lasers by color and others by wavelength', () => {
    expect(laserLabel(405)).toBe('Violet 405');
    expect(laserLabel(532)).toBe('Green 532');
    expect(laserLabel(445)).toBe('445 nm');
  });

  it('snaps a known spelling to the list’s and keeps an unknown one as typed', () => {
    expect(fluorSpelling(BUILT_IN_CATALOG, ' bv-421 ')).toBe('BV421');
    expect(fluorSpelling(BUILT_IN_CATALOG, ' Mystery Fluor 9 ')).toBe('Mystery Fluor 9');
  });
});
