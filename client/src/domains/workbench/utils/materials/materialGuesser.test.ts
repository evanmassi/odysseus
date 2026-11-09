import {
  CONJUGATE_NAMES,
  VENDOR_NAMES,
  findFluorochromeName,
  guessMaterial,
  isNonFluorochromeConjugate,
  listWithAnd,
  normalizeMaterialKey,
  splitPastedMaterials,
  type MaterialGuess,
  type RememberedMaterialKind,
} from './materialGuesser';

const nothingRemembered = new Map<string, RememberedMaterialKind>();
const guess = (text: string): MaterialGuess => guessMaterial(text, nothingRemembered);

describe('normalizeMaterialKey', () => {
  it('folds case, Greek letters and the micro sign into a bare alphanumeric key', () => {
    expect(normalizeMaterialKey('IFN-γ')).toBe('ifng');
    expect(normalizeMaterialKey('TCRαβ')).toBe('tcrab');
    expect(normalizeMaterialKey('NF-κB')).toBe('nfkb');
    expect(normalizeMaterialKey('10 µg/mL')).toBe('10ugml');
    expect(normalizeMaterialKey('5 μM')).toBe('5um');
    expect(normalizeMaterialKey('CD45.2 (Ly5.1)')).toBe('cd452ly51');
  });

  it('returns an empty key for punctuation only', () => {
    expect(normalizeMaterialKey(' - / ')).toBe('');
  });
});

describe('guessMaterial antibodies and labels', () => {
  it('reads a marker, fluorochrome and clone as an antibody', () => {
    expect(guess('CD4 BV421 clone RPA-T4')).toEqual({
      group: 'ab',
      type: 'Antibody',
      name: 'CD4 BV421 clone RPA-T4',
      values: { target: 'CD4', clone: 'RPA-T4', conjugate: 'BV421', laser: 'Violet 405' },
      why: 'BV421 is a fluorochrome',
      source: 'list',
    });
  });

  it('lifts the vendor and catalog number out of the name', () => {
    expect(guess('anti-mouse CD8a PE-Cy7 (53-6.7) BioLegend 100722')).toEqual({
      group: 'ab',
      type: 'Antibody',
      name: 'anti-mouse CD8a PE-Cy7 (53-6.7)',
      values: {
        vendor: 'BioLegend',
        catalog: '100722',
        target: 'CD8a',
        clone: '53-6.7',
        reactivity: 'Mouse',
        conjugate: 'PE-Cy7',
      },
      why: 'PE-Cy7 is a fluorochrome',
      source: 'list',
    });
  });

  it('recognizes a secondary by its anti-species isotype', () => {
    expect(guess('Goat anti-Rabbit IgG (H+L) Alexa Fluor 488 cross-adsorbed')).toMatchObject({
      type: 'Secondary reagent',
      values: {
        'host-species': 'Goat',
        'target-species-and-isotype': 'Rabbit IgG',
        conjugate: 'Alexa Fluor 488',
        'cross-adsorbed': 'Yes',
      },
      why: '“anti-Rabbit IgG” marks a secondary',
    });
  });

  it('reads an isotype control with its light chain', () => {
    expect(guess('Mouse IgG1, κ Isotype Ctrl APC')).toMatchObject({
      type: 'Isotype control',
      values: { isotype: 'IgG1, κ', 'host-species': 'Mouse', conjugate: 'APC' },
    });
  });

  it('files a known viability dye with its laser and dilution', () => {
    expect(guess('Zombie Aqua 1:500')).toEqual({
      group: 'ab',
      type: 'Dye',
      name: 'Zombie Aqua',
      values: { target: 'Viability', fixable: 'Yes', laser: 'Violet 405' },
      amount: { value: '500', unit: '1:N' },
      why: 'Zombie Aqua: known viability dye',
      source: 'list',
    });
  });

  it('keeps a streptavidin conjugate as a secondary reagent', () => {
    expect(guess('Streptavidin-HRP')).toMatchObject({
      group: 'ab',
      type: 'Secondary reagent',
      values: { conjugate: 'HRP' },
      why: 'Streptavidin HRP: known secondary reagent',
    });
  });

  it('files a therapeutic antibody with the antibodies', () => {
    expect(guess('pembrolizumab')).toMatchObject({
      group: 'ab',
      type: 'Antibody',
      why: 'pembrolizumab is a therapeutic antibody',
      source: 'none',
    });
  });
});

describe('guessMaterial reagents and media', () => {
  it('reads a species-prefixed cytokine as a recombinant protein with its amount', () => {
    expect(guess('rhIL-2 100 U/mL')).toEqual({
      group: 'chem',
      type: 'Recombinant protein',
      name: 'rhIL-2',
      values: { species: 'Human' },
      amount: { value: '100', unit: 'U/mL' },
      why: 'rhIL-2 is a cytokine or growth factor',
      source: 'list',
    });
  });

  it('reads medium details and the vendor catalog', () => {
    expect(guess('DMEM high glucose, Gibco 11965-092')).toMatchObject({
      type: 'Medium',
      name: 'DMEM high glucose',
      values: { vendor: 'Gibco', catalog: '11965-092', glucose: 'High' },
    });
  });

  it('turns a supplemented medium into a recipe', () => {
    expect(guess('RPMI 1640 + 10% FBS + 1% pen/strep')).toMatchObject({
      group: 'media',
      type: 'Medium',
      values: { recipe: 'RPMI 1640 + 10% FBS + 1% pen/strep' },
      why: 'a mix of RPMI 1640, FBS and pen/strep',
    });
  });

  it('reads calcium and magnesium on a buffer', () => {
    expect(guess('DPBS without calcium and magnesium').values).toEqual({
      'calcium-and-magnesium': 'Without',
    });
  });

  it('turns a chemical with a molar concentration into a stock solution', () => {
    expect(guess('NaCl 5 M')).toMatchObject({
      group: 'media',
      type: 'Stock solution',
      name: 'NaCl',
      amount: { value: '5', unit: 'M' },
    });
    expect(guess('DMSO 100 mM')).toMatchObject({ type: 'Stock solution', name: 'DMSO' });
  });

  it('calls anything with a concentration a stock solution', () => {
    expect(guess('hello world 10 µM')).toMatchObject({
      type: 'Stock solution',
      name: 'hello world',
      amount: { value: '10', unit: 'µM' },
      source: 'pattern',
    });
  });

  it('prefers a known kit name and falls back to name keywords', () => {
    expect(guess('Human IL-6 ELISA kit')).toMatchObject({
      type: 'Kit',
      why: 'ELISA kit: known kit',
    });
    expect(guess('GAPDH forward primer')).toMatchObject({ group: 'mol', type: 'Oligo' });
    expect(guess('Actb_F')).toMatchObject({ type: 'Oligo', why: '“_F” in the name' });
  });
});

describe('guessMaterial biology', () => {
  it('reads a mouse genotype', () => {
    expect(guess('C57BL/6J Rag1-/- mice').values).toEqual({
      species: 'Mouse',
      genotype: 'Rag1-/-',
    });
  });

  it('splits a microbe into species and strain', () => {
    expect(guess('E. coli DH5α').values).toEqual({ species: 'E. coli', strain: 'DH5α' });
  });

  it('reads anticoagulant and preservation', () => {
    expect(guess('EDTA plasma').values).toEqual({ fluid: 'Plasma', anticoagulant: 'EDTA' });
    expect(guess('FFPE tumor tissue').values).toEqual({ preservation: 'FFPE' });
  });

  it('reads an RRID out of a cell line name', () => {
    expect(guess('HeLa RRID:CVCL_0030')).toMatchObject({
      type: 'Cell line',
      name: 'HeLa',
      values: { rrid: 'CVCL_0030', species: 'Human' },
    });
  });
});

describe('guessMaterial patterns', () => {
  it('reads supply shapes', () => {
    expect(guess('96-well flat-bottom TC-treated plate, sterile')).toMatchObject({
      group: 'supplies',
      type: 'Plate',
      values: { format: '96-well', surface: 'TC-treated', bottom: 'Flat', sterile: 'Yes' },
      why: '“96-well” reads as a plate',
    });
    expect(guess('1000 µL filter tips low retention').values).toEqual({
      volume: '1000 µL',
      filtered: 'Yes',
      'low-retention': 'Yes',
    });
  });

  it('reads accessions, PDB IDs and versions', () => {
    expect(guess('GSE12345')).toMatchObject({
      type: 'Dataset',
      values: { repository: 'GEO', 'accession-number': 'GSE12345' },
      why: 'GSE12345 is a GEO ID',
    });
    expect(guess('6VXX').values).toEqual({ repository: 'PDB', 'accession-number': '6VXX' });
    expect(guess('FlowJo v10.9.0').values).toEqual({ version: '10.9.0' });
  });

  it('reads DNA and peptide sequences', () => {
    expect(guess("5'-ATGCGTACGTTAGCATGC-3'")).toMatchObject({
      type: 'Oligo',
      values: { sequence: 'ATGCGTACGTTAGCATGC-' },
    });
    expect(guess('GILGFVFTL')).toMatchObject({
      type: 'Peptide',
      values: { sequence: 'GILGFVFTL' },
    });
  });

  it('keeps the full name and moves the vendor to manufacturer for instruments', () => {
    expect(guess('BD LSRFortessa X-20')).toMatchObject({
      group: 'equip',
      name: 'BD LSRFortessa X-20',
      values: { model: 'BD LSRFortessa', manufacturer: 'BD' },
    });
    expect(guess('Thermo Fisher centrifuge').values).toEqual({ manufacturer: 'Thermo Fisher' });
  });

  it('leaves unrecognized text unsorted', () => {
    expect(guess('random text here')).toMatchObject({
      group: 'unsorted',
      type: 'Other',
      source: 'none',
    });
  });
});

describe('guessMaterial memory and context', () => {
  it('lets a remembered kind override the guess', () => {
    const remembered = new Map([['hela', { group: 'bio', type: 'Primary cells' }]]);
    expect(guessMaterial('HeLa', remembered)).toMatchObject({
      type: 'Primary cells',
      why: 'you filed it this way before',
      source: 'yours',
    });
  });

  it('keeps its own reason when memory agrees', () => {
    const remembered = new Map([
      ['hela', { group: 'bio', type: 'Cell line', why: 'already here' }],
    ]);
    expect(guessMaterial('HeLa', remembered)).toMatchObject({
      why: 'HeLa: known cell line',
      source: 'list',
    });
  });

  it('uses the table heading when nothing else matches', () => {
    expect(guessMaterial('mystery thing', nothingRemembered, { groupHint: 'mol' })).toMatchObject({
      group: 'mol',
      type: 'Other',
      why: 'from the table heading above it',
    });
  });

  it('reads vendor and identifier columns', () => {
    const context = { vendor: 'BioLegend', identifier: 'Cat# 300532; RRID:AB_2562598' };
    expect(guessMaterial('CD4 BV421', nothingRemembered, context).values).toEqual({
      vendor: 'BioLegend',
      rrid: 'AB_2562598',
      catalog: '300532',
      target: 'CD4',
      conjugate: 'BV421',
      laser: 'Violet 405',
    });
  });
});

describe('splitPastedMaterials', () => {
  it('strips bullets and numbering and skips blank lines', () => {
    const pasted = '- DMEM\r\n• 10% FBS\r\n\r\n2) pen/strep\n10. FlowJo\n  PBS  ';
    expect(splitPastedMaterials(pasted).map(row => row.text)).toEqual([
      'DMEM',
      '10% FBS',
      'pen/strep',
      'FlowJo',
      'PBS',
    ]);
  });

  it('reads a key resources table with headings and tab columns', () => {
    const table = [
      'REAGENT or RESOURCE\tSOURCE\tIDENTIFIER',
      'Antibodies',
      'CD4 BV421\tBioLegend\tCat# 300532; RRID:AB_2562598',
      'Software and algorithms:',
      'FlowJo v10\tBD\t',
      'Experimental models: Cell lines',
      'HEK293T\tATCC\tCRL-3216',
    ].join('\n');
    expect(splitPastedMaterials(table)).toEqual([
      {
        text: 'CD4 BV421',
        context: {
          groupHint: 'ab',
          vendor: 'BioLegend',
          identifier: 'Cat# 300532; RRID:AB_2562598',
        },
      },
      { text: 'FlowJo v10', context: { groupHint: 'soft', vendor: 'BD' } },
      { text: 'HEK293T', context: { groupHint: 'bio', vendor: 'ATCC', identifier: 'CRL-3216' } },
    ]);
  });

  it('feeds rows to guessMaterial the way the paste handler does', () => {
    const [row] = splitPastedMaterials('Other\nmystery thing\tSomeone');
    expect(guessMaterial(row.text, nothingRemembered, row.context)).toMatchObject({
      group: 'supplies',
      type: 'Other',
      values: { vendor: 'Someone' },
    });
  });
});

describe('lookup lists and helpers', () => {
  it('suggests canonical vendor names only', () => {
    expect(VENDOR_NAMES).toContain('Thermo Fisher');
    expect(VENDOR_NAMES).toContain('BioLegend');
    expect(VENDOR_NAMES).not.toContain('ThermoFisher');
  });

  it('suggests fluorochromes and chemical conjugates but not fluorescent proteins', () => {
    expect(CONJUGATE_NAMES).toContain('BV421');
    expect(CONJUGATE_NAMES).toContain('PE-Cy7');
    expect(CONJUGATE_NAMES.slice(-3)).toEqual(['HRP', 'Biotin', 'AP']);
    expect(CONJUGATE_NAMES).not.toContain('GFP');
  });

  it('tells chemical conjugates apart from fluorochromes', () => {
    expect(isNonFluorochromeConjugate('HRP')).toBe(true);
    expect(isNonFluorochromeConjugate('biotinylated')).toBe(true);
    expect(isNonFluorochromeConjugate('PE')).toBe(false);
  });

  it('resolves fluorochrome aliases to one name', () => {
    expect(findFluorochromeName('AF647')).toBe('Alexa Fluor 647');
    expect(findFluorochromeName('PE/Cyanine7')).toBe('PE-Cy7');
    expect(findFluorochromeName('mCherry')).toBe('mCherry');
    expect(findFluorochromeName('DMEM')).toBeUndefined();
  });

  it('joins words into a readable list', () => {
    expect(listWithAnd([])).toBe('');
    expect(listWithAnd(['DMEM'])).toBe('DMEM');
    expect(listWithAnd(['DMEM', 'FBS'])).toBe('DMEM and FBS');
    expect(listWithAnd(['DMEM', 'FBS', 'pen/strep'])).toBe('DMEM, FBS and pen/strep');
  });
});
